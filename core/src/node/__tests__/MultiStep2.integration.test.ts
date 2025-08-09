import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { getDefaultModels } from "@runtime/settings/models"
import { describe, expect, it } from "vitest"
import { InvocationPipeline } from "../InvocationPipeline"
import { ToolManager } from "../toolManager"

/**
 * Test MultiStep2 strategy - sequential tool execution with todoRead and todoWrite
 *
 * Pseudocode:
 * 1. Setup test workflow with a node that has todoRead and todoWrite tools
 * 2. Node system prompt instructs: "First read todos, then write 'Complete integration test'"
 * 3. Create InvocationPipeline with the node context and tool manager
 * 4. Execute pipeline (prepare -> execute -> process)
 * 5. Verify both tools were called in correct order:
 *    - todoRead called first
 *    - todoWrite called second
 * 6. Extract tool usage and validate sequential execution
 */

describe("MultiStep2 integration - todoRead and todoWrite", () => {
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

    const workflowId = "multistep2-test-workflow"

    await ensureWorkflowExists("MultiStep2 test workflow", workflowId)
    await createWorkflowVersion({
      workflowVersionId,
      workflowConfig: { nodes: [], entryNodeId: "test" },
      commitMessage: "MultiStep2 test version",
      workflowId,
    })
    await createWorkflowInvocation({
      workflowInvocationId,
      workflowVersionId,
    })

    await saveNodeVersionToDB({
      config: {
        nodeId,
        modelName: getDefaultModels().default,
        systemPrompt:
          "First, read the current todos. Then write a new todo item: 'Complete integration test'.",
        mcpTools: [],
        codeTools: ["todoRead", "todoWrite"],
        description: "MultiStep2 test node with todo tools",
        handOffs: ["end"],
        waitingFor: [],
      },
      workflowVersionId,
    })
  }

  it("should run todoRead and todoWrite sequentially", async () => {
    const workflowInvocationId = `multistep2-test-${Date.now()}`
    const workflowVersionId = "multistep2-v1"
    const nodeId = "multistep2-test-node"

    await setupTestWorkflow(workflowInvocationId, workflowVersionId, nodeId)

    const context = {
      nodeId,
      workflowMessageIncoming: new WorkflowMessage({
        fromNodeId: "start",
        toNodeId: nodeId,
        seq: 1,
        payload: {
          kind: "sequential" as const,
          prompt: "Please execute the tasks in your system prompt.",
        },
        wfInvId: workflowInvocationId,
        originInvocationId: null,
      }),
      workflowInvocationId,
      startTime: new Date().toISOString(),
      handOffs: ["end"],
      nodeDescription: "MultiStep2 test node with todo tools",
      nodeSystemPrompt:
        "First, read the current todos. Then write a new todo item: 'Complete integration test'.",
      replyMessage: null,
      workflowVersionId,
      mainWorkflowGoal: "Test MultiStep2 with todo workflow",
      model: getDefaultModels().default,
      workflowFiles: [],
      expectedOutputType: undefined,
      workflowId: "multistep2-test-workflow",
    }

    const toolManager = new ToolManager(
      "multistep2-test",
      [],
      ["todoRead", "todoWrite"],
      workflowVersionId
    )

    const pipeline = new InvocationPipeline(
      context,
      toolManager,
      getDefaultModels().default
    )

    await pipeline.prepare()
    await pipeline.execute()
    const result = await pipeline.process()

    expect(result).toBeDefined()
    if (result.error) {
      throw new Error(`Pipeline execution failed: ${result.error.message}`)
    }

    // extract tool usage
    const agentSteps = pipeline.getAgentSteps()
    const toolCalls = agentSteps.filter((output) => output.type === "tool")
    const toolsUsed = toolCalls.map((call) => call.name)

    // verify both tools were called
    expect(toolsUsed).toContain("todoRead")
    expect(toolsUsed).toContain("todoWrite")

    // verify correct order: todoRead first, then todoWrite
    const todoReadIndex = toolsUsed.indexOf("todoRead")
    const todoWriteIndex = toolsUsed.indexOf("todoWrite")

    expect(todoReadIndex).toBeGreaterThan(-1)
    expect(todoWriteIndex).toBeGreaterThan(-1)
    expect(todoReadIndex).toBeLessThan(todoWriteIndex)

    console.log("✅ MultiStep2 Test Results:", {
      toolsExecuted: toolsUsed,
      correctOrder: todoReadIndex < todoWriteIndex,
      totalCost: 0,
    })
  }, 60000) // 1 minute timeout
})
