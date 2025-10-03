import { getDefaultModels } from "@core/core-config/compat"
import { extractTextFromPayload } from "@core/messages/MessagePayload"
import type { NodeInvocationResult } from "@core/node/WorkFlowNode"
import { describe, expect, it } from "vitest"
import type { InvocationPipeline } from "../InvocationPipeline"
import type { NodeInvocationCallContext } from "../input.types"

// TODO: These integration tests make real LLM calls and should be in a separate test suite
// TODO: Tests are extremely long (2-3 minutes) and expensive to run
// TODO: Missing cleanup of database records created during tests
// Clean extractor for test results
interface TestResult {
  toolsUsed: string[]
  toolExecutionOrder: { tool: string; sequence: number }[]
  finalResponse: string
  cost: number
  reasoningSteps: number
  terminationOccurred: boolean
}

describe("InvocationPipeline Real Integration", () => {
  const extractTestResult = (pipeline: InvocationPipeline, pipelineResult: NodeInvocationResult): TestResult => {
    const agentSteps = pipeline.getAgentSteps()
    const toolCalls = agentSteps.filter(output => output.type === "tool")
    const toolsUsed = toolCalls.map(call => call.name)
    const toolExecutionOrder = toolsUsed.map((tool, index) => ({
      tool,
      sequence: index,
    }))

    // Extract final response cleanly from pipeline result
    const replyPayload = pipelineResult?.replyMessage
    const finalResponse = extractTextFromPayload(replyPayload)

    const reasoningSteps = agentSteps.filter((o: any) => o.type === "reasoning").length
    const terminationOccurred = agentSteps.some((o: any) => o.type === "terminate")

    return {
      toolsUsed,
      toolExecutionOrder,
      finalResponse,
      cost: 0,
      reasoningSteps,
      terminationOccurred,
    }
  }

  // TODO: This helper creates real database records but doesn't clean them up
  // Should use transactions or cleanup in afterEach
  // Helper function to set up required database records
  const setupTestWorkflow = async (workflowInvocationId: string, workflowVersionId: string, _nodeId: string) => {
    const { createWorkflowInvocation, createWorkflowVersion, ensureWorkflowExists } = await import(
      "@core/utils/persistence/workflow/registerWorkflow"
    )
    // const { saveNodeVersionToDB } = await import("@core/utils/persistence/node/saveNode")

    const workflowId = "real-pipeline-workflow"

    // Create the workflow hierarchy: Workflow -> WorkflowVersion -> WorkflowInvocation -> NodeVersion
    await ensureWorkflowExists(undefined, "Real pipeline test workflow", workflowId)
    await createWorkflowVersion({
      persistence: undefined,
      workflowVersionId,
      workflowConfig: { nodes: [], entryNodeId: "test" },
      commitMessage: "Real pipeline test version",
      workflowId,
    })
    await createWorkflowInvocation({
      persistence: undefined,
      workflowInvocationId,
      workflowVersionId,
    })

    // Create NodeVersion for the test node
    // await saveNodeVersionToDB({
    //   config: {
    //     nodeId,
    //     modelName: getDefaultModels().default,
    //     systemPrompt: "use todo write first, and then return the output of todo read",
    //     mcpTools: [],
    //     codeTools: ["todoWrite", "todoRead"],
    //     description: "Real pipeline test node with todo tools",
    //     handOffs: ["end"],
    //     waitingFor: [],
    //   },
    //   workflowVersionId,
    // })
  }

  it("should use real InvocationPipeline with system prompt and real tools", async () => {
    // Import dynamically to avoid circular dependencies
    const { WorkflowMessage } = await import("@core/messages/WorkflowMessage")
    const { InvocationPipeline } = await import("../InvocationPipeline")
    const { ToolManager } = await import("@core/node/toolManager")
    const { sendAI } = await import("@core/messages/api/sendAI/sendAI")

    const workflowInvocationId = `real-pipeline-test-${Date.now()}`
    const workflowVersionId = "real-pipeline-v1"
    const nodeId = "real-pipeline-test-node"

    // Set up required database records
    await setupTestWorkflow(workflowInvocationId, workflowVersionId, nodeId)

    // The exact system prompt you wanted tested
    const systemPrompt = "first write a todo, and then read the todo list."

    const context: NodeInvocationCallContext = {
      workflowMessageIncoming: new WorkflowMessage({
        fromNodeId: "start",
        toNodeId: nodeId,
        seq: 1,
        payload: {
          kind: "sequential" as const,
          berichten: [
            {
              type: "text",
              text: "I need you to create a todo item for 'Test real pipeline execution' and then show me all my current todos",
            },
          ],
        },
        wfInvId: workflowInvocationId,
        originInvocationId: null,
      }),
      workflowInvocationId,
      startTime: new Date().toISOString(),
      workflowVersionId,
      mainWorkflowGoal: "Test real InvocationPipeline with todo workflow",
      workflowFiles: [],
      expectedOutputType: undefined,
      workflowId: "real-pipeline-workflow",
      toolStrategyOverride: "v3" as const,
      nodeConfig: {
        nodeId,
        modelName: getDefaultModels().medium,
        systemPrompt: systemPrompt,
        mcpTools: [],
        codeTools: ["todoWrite", "todoRead"],
        description: "Real pipeline test node with todo tools",
        handOffs: ["end"],
        waitingFor: [],
      },
      nodeMemory: {},
      workflowConfig: undefined,
      skipDatabasePersistence: true,
    }

    // Create tool manager with REAL todo tools - no mocking
    const toolManager = new ToolManager(
      "real-pipeline-test",
      [],
      ["todoWrite", "todoRead"], // Real tools
      workflowVersionId,
    )

    // Create REAL InvocationPipeline instance
    const pipeline = new InvocationPipeline(context, toolManager)

    // Execute the REAL pipeline - this will make actual LLM calls
    await pipeline.prepare()
    await pipeline.execute()
    const result = await pipeline.process()

    // Verify the pipeline succeeded
    expect(result).toBeDefined()
    if (result.error) {
      throw new Error(`Pipeline execution failed: ${result.error.message}`)
    }

    // Extract clean test results
    const testResult = extractTestResult(pipeline, result)

    // Core assertions: system prompt compliance
    expect(testResult.toolsUsed).toContain("todoWrite")
    expect(testResult.toolsUsed).toContain("todoRead")

    // Critical: system prompt "use todo write first, and then return the output of todo read"
    // This means: todoWrite, then todoRead, then STOP
    const todoWriteIndex = testResult.toolsUsed.indexOf("todoWrite")
    const todoReadIndex = testResult.toolsUsed.indexOf("todoRead")
    const lastTodoReadIndex = testResult.toolsUsed.lastIndexOf("todoRead")

    expect(todoWriteIndex).toBeGreaterThan(-1)
    expect(todoReadIndex).toBeGreaterThan(-1)
    expect(todoWriteIndex).toBeLessThan(todoReadIndex)

    // System prompt implies: write first, read second, then stop
    // No tools should be called after the final todoRead
    const toolsAfterLastTodoRead = testResult.toolsUsed.slice(lastTodoReadIndex + 1)
    expect(toolsAfterLastTodoRead).toEqual([])

    // TODO: Using another LLM call to verify test results is unreliable and expensive
    // Should use deterministic assertions instead
    // Verify the response contains todo information (should be output of todoRead)
    const verification = await sendAI({
      model: getDefaultModels().default,
      mode: "text",
      debug: true,
      messages: [
        {
          role: "user",
          content: `
          Analyze this response from a real todo workflow execution:
          "${testResult.finalResponse}"
          
          Does this response show that:
          1. A todo was created using todoWrite
          2. The current todo list was returned using todoRead
          3. The final output appears to be from todoRead (showing todos)
          
          Respond "SUCCESS" if all conditions are met, "FAILURE" if not.
        `,
        },
      ],
    })

    expect(verification.success).toBe(true)
    expect(verification.data?.text).toContain("SUCCESS")

    // Clean summary output
    console.log("✅ Test Results:", {
      systemPromptFollowed: "use todo write first, and then return the output of todo read",
      toolExecutionOrder: testResult.toolExecutionOrder.map(t => t.tool),
      correctOrder: todoWriteIndex < todoReadIndex,
      cost: testResult.cost,
      responseValid: verification.data?.text?.includes("SUCCESS"),
    })
  }, 120000) // 2 minute timeout for real LLM execution

  it("should work with experimental multi-step loop using real tools", async () => {
    const { WorkflowMessage } = await import("@core/messages/WorkflowMessage")
    const { InvocationPipeline } = await import("../InvocationPipeline")
    const { ToolManager } = await import("@core/node/toolManager")
    const { CONFIG } = await import("@core/core-config/compat")

    const originalMultiStep = CONFIG.tools.experimentalMultiStepLoop

    Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
      value: true,
      writable: true,
    })

    try {
      const workflowInvocationId = `real-multi-pipeline-test-${Date.now()}`
      const workflowVersionId = "real-multi-pipeline-v1"
      const nodeId = "real-multi-pipeline-test-node"

      // Set up required database records
      await setupTestWorkflow(workflowInvocationId, workflowVersionId, nodeId)

      const systemPrompt = "use todo write first, and then return the output of todo read"

      const context: NodeInvocationCallContext = {
        workflowMessageIncoming: new WorkflowMessage({
          fromNodeId: "start",
          toNodeId: nodeId,
          seq: 1,
          payload: {
            kind: "sequential" as const,
            berichten: [
              {
                type: "text",
                text: "Create a todo and show me the current list",
              },
            ],
          },
          wfInvId: workflowInvocationId,
          originInvocationId: null,
        }),
        workflowInvocationId,
        startTime: new Date().toISOString(),
        workflowVersionId,
        mainWorkflowGoal: "Test real multi-step InvocationPipeline",
        workflowFiles: [],
        expectedOutputType: undefined,
        workflowId: "real-multi-pipeline-workflow",
        nodeConfig: {
          nodeId,
          modelName: getDefaultModels().default,
          systemPrompt: systemPrompt,
          mcpTools: [],
          codeTools: ["todoWrite", "todoRead"],
          description: "Real multi-step pipeline test",
          handOffs: ["end"],
          waitingFor: [],
        },
        nodeMemory: {},
        workflowConfig: undefined,
        skipDatabasePersistence: true,
      }

      const toolManager = new ToolManager("real-multi-pipeline-test", [], ["todoWrite", "todoRead"], workflowVersionId)

      const pipeline = new InvocationPipeline(context, toolManager)

      await pipeline.prepare()
      await pipeline.execute()
      const result = await pipeline.process()

      expect(result).toBeDefined()
      if (result.error) {
        throw new Error(`Multi-step pipeline execution failed: ${result.error.message}`)
      }

      // Extract clean test results
      const testResult = extractTestResult(pipeline, result)

      // Verify multi-step execution still follows system prompt
      expect(testResult.toolsUsed).toContain("todoWrite")
      expect(testResult.toolsUsed).toContain("todoRead")

      // Verify order maintained in multi-step - same strict requirements as regular test
      const todoWriteIndex = testResult.toolsUsed.indexOf("todoWrite")
      const todoReadIndex = testResult.toolsUsed.indexOf("todoRead")
      const lastTodoReadIndex = testResult.toolsUsed.lastIndexOf("todoRead")

      expect(todoWriteIndex).toBeLessThan(todoReadIndex)

      // Multi-step should still follow system prompt: write first, read second, then stop
      const toolsAfterLastTodoRead = testResult.toolsUsed.slice(lastTodoReadIndex + 1)
      expect(toolsAfterLastTodoRead).toEqual([])

      // Verify multi-step specific behaviors
      expect(testResult.terminationOccurred).toBe(true)
      expect(testResult.reasoningSteps).toBeGreaterThan(0)

      // Clean summary output
      console.log("✅ Multi-step Test Results:", {
        toolsExecuted: testResult.toolsUsed,
        correctOrderMaintained: todoWriteIndex < todoReadIndex,
        reasoningSteps: testResult.reasoningSteps,
        terminationOccurred: testResult.terminationOccurred,
        cost: testResult.cost,
      })
    } finally {
      Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
        value: originalMultiStep,
        writable: true,
      })
    }
  }, 180000) // 3 minute timeout for multi-step execution

  // TODO: Only testing one model when comment says "Test with medium model"
  // Should either test multiple models or update comment
  // Test with medium model
  const testModels = [getDefaultModels().medium]

  testModels.forEach(modelName => {
    it(`should work with model ${modelName}`, async () => {
      const { WorkflowMessage } = await import("@core/messages/WorkflowMessage")
      const { InvocationPipeline } = await import("../InvocationPipeline")
      const { ToolManager } = await import("@core/node/toolManager")
      const { sendAI } = await import("@core/messages/api/sendAI/sendAI")

      const workflowInvocationId = `model-test-${modelName.replace(/\W/g, "-")}-${Date.now()}`
      const workflowVersionId = `model-test-${modelName.replace(/\W/g, "-")}-v1`
      const nodeId = `model-test-${modelName.replace(/\W/g, "-")}-node`

      // Set up required database records
      await setupTestWorkflow(workflowInvocationId, workflowVersionId, nodeId)

      const systemPrompt = "use todo write first, and then return the output of todo read"

      const context: NodeInvocationCallContext = {
        workflowMessageIncoming: new WorkflowMessage({
          fromNodeId: "start",
          toNodeId: nodeId,
          seq: 1,
          payload: {
            kind: "sequential" as const,
            berichten: [
              {
                type: "text",
                text: `Create a todo for testing ${modelName} and show me the list`,
              },
            ],
          },
          wfInvId: workflowInvocationId,
          originInvocationId: null,
        }),
        workflowInvocationId,
        startTime: new Date().toISOString(),
        workflowVersionId,
        mainWorkflowGoal: `Test InvocationPipeline with ${modelName}`,
        workflowFiles: [],
        expectedOutputType: undefined,
        workflowId: "model-test-workflow",
        toolStrategyOverride: "v3" as const,
        nodeConfig: {
          nodeId,
          modelName: modelName as any,
          systemPrompt: systemPrompt,
          mcpTools: [],
          codeTools: ["todoWrite", "todoRead"],
          description: `Model test node for ${modelName}`,
          handOffs: ["end"],
          waitingFor: [],
        },
        nodeMemory: {},
        workflowConfig: undefined,
        skipDatabasePersistence: true,
      }

      const toolManager = new ToolManager(
        `model-test-${modelName.replace(/\W/g, "-")}`,
        [],
        ["todoWrite", "todoRead"],
        workflowVersionId,
      )

      const pipeline = new InvocationPipeline(context, toolManager)

      await pipeline.prepare()
      await pipeline.execute()
      const result = await pipeline.process()

      expect(result).toBeDefined()
      if (result.error) {
        throw new Error(`Model ${modelName} failed: ${result.error.message}`)
      }

      const testResult = extractTestResult(pipeline, result)

      // Core system prompt validation for each model
      expect(testResult.toolsUsed).toContain("todoWrite")
      expect(testResult.toolsUsed).toContain("todoRead")

      const todoWriteIndex = testResult.toolsUsed.indexOf("todoWrite")
      const todoReadIndex = testResult.toolsUsed.indexOf("todoRead")
      const lastTodoReadIndex = testResult.toolsUsed.lastIndexOf("todoRead")

      expect(todoWriteIndex).toBeLessThan(todoReadIndex)

      // No tools after final todoRead
      const toolsAfterLastTodoRead = testResult.toolsUsed.slice(lastTodoReadIndex + 1)
      expect(toolsAfterLastTodoRead).toEqual([])

      // Verify response quality
      const verification = await sendAI({
        model: modelName as any,
        mode: "text",
        messages: [
          {
            role: "user",
            content: `
            Analyze this response from ${modelName}:
            "${testResult.finalResponse}"
            
            Does this response show:
            1. A todo was created using todoWrite
            2. The current todo list was returned using todoRead
            3. The final output appears to be from todoRead
            
            Respond "SUCCESS" if all conditions are met, "FAILURE" if not.
          `,
          },
        ],
      })

      expect(verification.success).toBe(true)
      expect(verification.data?.text).toContain("SUCCESS")

      console.log(`✅ ${modelName} Test:`, {
        toolOrder: testResult.toolExecutionOrder.map(t => t.tool),
        correctOrder: todoWriteIndex < todoReadIndex,
        cost: testResult.cost,
        valid: verification.data?.text?.includes("SUCCESS"),
      })
    }, 120000)
  })
})
