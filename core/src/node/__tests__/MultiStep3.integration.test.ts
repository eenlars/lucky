import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { getDefaultModels } from "@runtime/settings/models"
import { describe, expect, it } from "vitest"
import {
  InvocationPipeline,
  type NodeInvocationCallContext,
} from "../InvocationPipeline"
import { ToolManager } from "../toolManager"

describe("MultiStep3 integration - todoRead and todoWrite", () => {
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

    const workflowId = "multistep3-test-workflow"

    await ensureWorkflowExists("MultiStep3 test workflow", workflowId)
    await createWorkflowVersion({
      workflowVersionId,
      workflowConfig: { nodes: [], entryNodeId: "test" },
      commitMessage: "MultiStep3 test version",
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
        description: "MultiStep3 test node with todo tools",
        handOffs: ["end"],
        waitingFor: [],
      },
      workflowVersionId,
    })
  }

  it("should run todoRead and todoWrite sequentially", async () => {
    const workflowInvocationId = `multistep3-test-${Date.now()}`
    const workflowVersionId = "multistep3-v1"
    const nodeId = "multistep3-test-node"

    await setupTestWorkflow(workflowInvocationId, workflowVersionId, nodeId)

    const context: NodeInvocationCallContext = {
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
      nodeDescription: "MultiStep3 test node with todo tools",
      nodeSystemPrompt:
        "First, read the current todos. Then write a new todo item: 'Complete integration test'.",
      replyMessage: null,
      workflowVersionId,
      mainWorkflowGoal: "Test MultiStep3 with todo workflow",
      model: getDefaultModels().default,
      workflowFiles: [],
      expectedOutputType: undefined,
      workflowId: "multistep3-test-workflow",
      nodeMemory: {},
      skipDatabasePersistence: true,
      workflowConfig: undefined,
      toolStrategyOverride: "v3",
    }

    const toolManager = new ToolManager(
      "multistep3-test",
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

    console.log("✅ MultiStep3 Test Results:", {
      toolsExecuted: toolsUsed,
      correctOrder: todoReadIndex < todoWriteIndex,
      totalCost: 0,
    })
  }, 60000) // 1 minute timeout
})
