import { MODELS } from "@runtime/settings/constants.client"
import { describe, expect, it } from "vitest"

describe("InvocationPipeline Real Integration", () => {
  // FAILING: This test suite is failing because the todoWrite tool isn't being executed properly
  // The error logs show "execTool error {} {"type": "tool", "toolName": "todoWrite"}"
  // This suggests that the tool execution is failing but returning empty error objects
  // The test expects 'todoWrite' to be in the tools used array but it's coming back empty []
  // Issue is likely in the tool execution pipeline - either tool registration or execution logic

  // Clean extractor for test results
  interface TestResult {
    toolsUsed: string[]
    toolExecutionOrder: { tool: string; sequence: number }[]
    finalResponse: string
    cost: number
    reasoningSteps: number
    terminationOccurred: boolean
  }

  const extractTestResult = (
    pipeline: any,
    pipelineResult: any
  ): TestResult => {
    const toolUsage = pipeline.getToolUsage()
    const toolCalls = toolUsage.outputs.filter(
      (output: any) => output.type === "tool"
    )
    const toolsUsed = toolCalls.map((call: any) => call.name)
    const toolExecutionOrder = toolsUsed.map((tool: string, index: number) => ({
      tool,
      sequence: index,
    }))

    // Extract final response cleanly from pipeline result
    const replyPayload = pipelineResult?.replyMessage
    const finalResponse =
      replyPayload?.kind === "result"
        ? replyPayload.workDone
        : replyPayload?.kind === "error"
          ? replyPayload.message
          : JSON.stringify(replyPayload) || ""

    const reasoningSteps = toolUsage.outputs.filter(
      (o: any) => o.type === "reasoning"
    ).length
    const terminationOccurred = toolUsage.outputs.some(
      (o: any) => o.type === "terminate"
    )

    return {
      toolsUsed,
      toolExecutionOrder,
      finalResponse,
      cost: toolUsage.totalCost,
      reasoningSteps,
      terminationOccurred,
    }
  }

  // Helper function to set up required database records
  const setupTestWorkflow = async (
    workflowInvocationId: string,
    workflowVersionId: string,
    nodeId: string
  ) => {
    const {
      createWorkflowInvocation,
      createWorkflowVersion,
      ensureWorkflowExists,
    } = await import("@core/utils/persistence/workflow/registerWorkflow")
    const { saveNodeVersionToDB } = await import(
      "@core/utils/persistence/node/saveNode"
    )

    const workflowId = "real-pipeline-workflow"

    // Create the workflow hierarchy: Workflow -> WorkflowVersion -> WorkflowInvocation -> NodeVersion
    await ensureWorkflowExists("Real pipeline test workflow", workflowId)
    await createWorkflowVersion({
      workflowVersionId,
      workflowConfig: { nodes: [], entryNodeId: "test" },
      commitMessage: "Real pipeline test version",
      workflowId,
    })
    await createWorkflowInvocation({
      workflowInvocationId,
      workflowVersionId,
    })

    // Create NodeVersion for the test node
    await saveNodeVersionToDB({
      config: {
        nodeId,
        modelName: MODELS.default,
        systemPrompt:
          "use todo write first, and then return the output of todo read",
        mcpTools: [],
        codeTools: ["todoWrite", "todoRead"],
        description: "Real pipeline test node with todo tools",
        handOffs: ["end"],
        waitingFor: [],
      },
      workflowVersionId,
    })
  }

  it("should use real InvocationPipeline with system prompt and real tools", async () => {
    // Import dynamically to avoid circular dependencies
    const { WorkflowMessage } = await import("@core/messages/WorkflowMessage")
    const { InvocationPipeline } = await import("../InvocationPipeline")
    const { ToolManager } = await import("../toolManager")
    const { sendAI } = await import("@core/messages/api/sendAI")

    const workflowInvocationId = `real-pipeline-test-${Date.now()}`
    const workflowVersionId = "real-pipeline-v1"
    const nodeId = "real-pipeline-test-node"

    // Set up required database records
    await setupTestWorkflow(workflowInvocationId, workflowVersionId, nodeId)

    // The exact system prompt you wanted tested
    const systemPrompt = "first write a todo, and then read the todo list."

    const context = {
      nodeId,
      workflowMessageIncoming: new WorkflowMessage({
        fromNodeId: "start",
        toNodeId: nodeId,
        seq: 1,
        payload: {
          kind: "sequential" as const,
          prompt:
            "I need you to create a todo item for 'Test real pipeline execution' and then show me all my current todos",
        },
        wfInvId: workflowInvocationId,
        originInvocationId: null,
      }),
      workflowInvocationId,
      startTime: new Date().toISOString(),
      handOffs: ["end"],
      nodeDescription: "Real pipeline test node with todo tools",
      nodeSystemPrompt: systemPrompt, // This is the key - real system prompt
      replyMessage: null,
      workflowVersionId,
      mainWorkflowGoal: "Test real InvocationPipeline with todo workflow",
      model: MODELS.default,
      workflowFiles: [],
      expectedOutputType: undefined,
      workflowId: "real-pipeline-workflow",
    }

    // Create tool manager with REAL todo tools - no mocking
    const toolManager = new ToolManager(
      "real-pipeline-test",
      [],
      ["todoWrite", "todoRead"], // Real tools
      workflowVersionId
    )

    // Create REAL InvocationPipeline instance
    const pipeline = new InvocationPipeline(
      context,
      toolManager,
      MODELS.default
    )

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
    const toolsAfterLastTodoRead = testResult.toolsUsed.slice(
      lastTodoReadIndex + 1
    )
    expect(toolsAfterLastTodoRead).toEqual([])

    // Verify the response contains todo information (should be output of todoRead)
    const verification = await sendAI({
      model: MODELS.default,
      mode: "text",
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
      systemPromptFollowed:
        "use todo write first, and then return the output of todo read",
      toolExecutionOrder: testResult.toolExecutionOrder.map((t) => t.tool),
      correctOrder: todoWriteIndex < todoReadIndex,
      cost: testResult.cost,
      responseValid: verification.data?.text?.includes("SUCCESS"),
    })
  }, 120000) // 2 minute timeout for real LLM execution

  it("should work with experimental multi-step loop using real tools", async () => {
    const { WorkflowMessage } = await import("@core/messages/WorkflowMessage")
    const { InvocationPipeline } = await import("../InvocationPipeline")
    const { ToolManager } = await import("../toolManager")
    const { CONFIG } = await import("@runtime/settings/constants")

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

      const systemPrompt =
        "use todo write first, and then return the output of todo read"

      const context = {
        nodeId,
        workflowMessageIncoming: new WorkflowMessage({
          fromNodeId: "start",
          toNodeId: nodeId,
          seq: 1,
          payload: {
            kind: "sequential" as const,
            prompt: "Create a todo and show me the current list",
          },
          wfInvId: workflowInvocationId,
          originInvocationId: null,
        }),
        workflowInvocationId,
        startTime: new Date().toISOString(),
        handOffs: ["end"],
        nodeDescription: "Real multi-step pipeline test",
        nodeSystemPrompt: systemPrompt,
        replyMessage: null,
        workflowVersionId,
        mainWorkflowGoal: "Test real multi-step InvocationPipeline",
        model: MODELS.default,
        workflowFiles: [],
        expectedOutputType: undefined,
        workflowId: "real-multi-pipeline-workflow",
      }

      const toolManager = new ToolManager(
        "real-multi-pipeline-test",
        [],
        ["todoWrite", "todoRead"],
        workflowVersionId
      )

      const pipeline = new InvocationPipeline(
        context,
        toolManager,
        MODELS.default
      )

      await pipeline.prepare()
      await pipeline.execute()
      const result = await pipeline.process()

      expect(result).toBeDefined()
      if (result.error) {
        throw new Error(
          `Multi-step pipeline execution failed: ${result.error.message}`
        )
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
      const toolsAfterLastTodoRead = testResult.toolsUsed.slice(
        lastTodoReadIndex + 1
      )
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

  // Test with all available models from pricing.types.ts (except kimi)
  const testModels = [
    MODELS.default,
    "openai/gpt-4.1-mini",
    "openai/gpt-4.1",
    "google/gemini-2.5-flash-lite",
    "meta-llama/llama-4-maverick",
    "qwen/qwen2.5-vl-32b-instruct",
    "openai/o4-mini-high",
    "anthropic/claude-sonnet-4",
    "x-ai/grok-4",
    "deepseek/deepseek-r1-0528:free",
    "google/gemini-2.0-flash-001",
    "switchpoint/router",
  ] as const

  testModels.forEach((modelName) => {
    it(`should work with model ${modelName}`, async () => {
      const { WorkflowMessage } = await import("@core/messages/WorkflowMessage")
      const { InvocationPipeline } = await import("../InvocationPipeline")
      const { ToolManager } = await import("../toolManager")
      const { sendAI } = await import("@core/messages/api/sendAI")

      const workflowInvocationId = `model-test-${modelName.replace(/\W/g, "-")}-${Date.now()}`
      const workflowVersionId = `model-test-${modelName.replace(/\W/g, "-")}-v1`
      const nodeId = `model-test-${modelName.replace(/\W/g, "-")}-node`

      // Set up required database records
      await setupTestWorkflow(workflowInvocationId, workflowVersionId, nodeId)

      const systemPrompt =
        "use todo write first, and then return the output of todo read"

      const context = {
        nodeId,
        workflowMessageIncoming: new WorkflowMessage({
          fromNodeId: "start",
          toNodeId: nodeId,
          seq: 1,
          payload: {
            kind: "sequential" as const,
            prompt: `Create a todo for testing ${modelName} and show me the list`,
          },
          wfInvId: workflowInvocationId,
          originInvocationId: null,
        }),
        workflowInvocationId,
        startTime: new Date().toISOString(),
        handOffs: ["end"],
        nodeDescription: `Model test node for ${modelName}`,
        nodeSystemPrompt: systemPrompt,
        replyMessage: null,
        workflowVersionId,
        mainWorkflowGoal: `Test InvocationPipeline with ${modelName}`,
        model: modelName,
        workflowFiles: [],
        expectedOutputType: undefined,
        workflowId: "model-test-workflow",
      }

      const toolManager = new ToolManager(
        `model-test-${modelName.replace(/\W/g, "-")}`,
        [],
        ["todoWrite", "todoRead"],
        workflowVersionId
      )

      const pipeline = new InvocationPipeline(
        context as any,
        toolManager,
        modelName as any
      )

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
      const toolsAfterLastTodoRead = testResult.toolsUsed.slice(
        lastTodoReadIndex + 1
      )
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
        toolOrder: testResult.toolExecutionOrder.map((t) => t.tool),
        correctOrder: todoWriteIndex < todoReadIndex,
        cost: testResult.cost,
        valid: verification.data?.text?.includes("SUCCESS"),
      })
    }, 120000)
  })
})
