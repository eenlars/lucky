import { getDefaultModels } from "@core/core-config/compat"
import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { describe, expect, it } from "vitest"
import { InvocationPipeline } from "../../messages/pipeline/InvocationPipeline"
import type { NodeInvocationCallContext } from "../../messages/pipeline/input.types"
import { ToolManager } from "../toolManager"

const model = getDefaultModels().medium

describe("MultiStep3 integration - todoRead and todoWrite", () => {
  // TODO: this test is nearly identical to MultiStep2.spec.test.ts with only difference
  // being toolStrategyOverride: "v3". should refactor to avoid duplication or at least
  // document what specific v3 behavior is being tested. also same issues as MultiStep2:
  // integration test making real calls, only testing order not correctness.
  const setupTestWorkflow = async (workflowInvocationId: string, workflowVersionId: string, _nodeId: string) => {
    const { createWorkflowInvocation, createWorkflowVersion, ensureWorkflowExists } = await import(
      "@core/utils/persistence/workflow/registerWorkflow"
    )

    const workflowId = "multistep3-test-workflow"

    // Pass undefined persistence - these test functions handle it gracefully
    await ensureWorkflowExists(undefined, "MultiStep3 test workflow", workflowId)
    await createWorkflowVersion({
      persistence: undefined,
      workflowVersionId,
      workflowConfig: { nodes: [], entryNodeId: "test" },
      commitMessage: "MultiStep3 test version",
      workflowId,
    })
    await createWorkflowInvocation({
      persistence: undefined,
      workflowInvocationId,
      workflowVersionId,
    })

    // Node version is handled in-memory for this test
    // The actual node config is passed directly in the context below
  }

  it("should run todoRead and todoWrite sequentially", async () => {
    const workflowInvocationId = `multistep3-test-${Date.now()}`
    const workflowVersionId = "multistep3-v1"
    const nodeId = "multistep3-test-node"

    await setupTestWorkflow(workflowInvocationId, workflowVersionId, nodeId)

    const context: NodeInvocationCallContext = {
      nodeConfig: {
        nodeId,
        mcpTools: [],
        codeTools: ["todoRead", "todoWrite"],
        description: "MultiStep3 test node with todo tools",
        systemPrompt: "First, read the current todos. Then write a new todo item: 'Complete integration test'.",
        modelName: model,
        handOffs: ["end"],
        waitingFor: [],
      },
      workflowMessageIncoming: new WorkflowMessage({
        fromNodeId: "start",
        toNodeId: nodeId,
        seq: 1,
        payload: {
          kind: "sequential" as const,
          berichten: [
            {
              type: "text",
              text: "Please execute the tasks in your system prompt.",
            },
          ],
        },
        wfInvId: workflowInvocationId,
        originInvocationId: null,
      }),
      workflowInvocationId,
      workflowVersionId,
      startTime: new Date().toISOString(),
      nodeMemory: {},
      mainWorkflowGoal: "Test MultiStep3 with todo workflow",
      workflowId: "multistep3-test-workflow",
      workflowFiles: [],
      expectedOutputType: undefined,
      skipDatabasePersistence: true,
      workflowConfig: undefined,
      toolStrategyOverride: "v3" as const,
    }

    const toolManager = new ToolManager("multistep3-test", [], ["todoRead", "todoWrite"], workflowVersionId)

    const pipeline = new InvocationPipeline(context, toolManager)

    await pipeline.prepare()
    await pipeline.execute()
    const result = await pipeline.process()

    expect(result).toBeDefined()
    if (result.error) {
      throw new Error(`Pipeline execution failed: ${result.error.message}`)
    }

    // extract tool usage
    const agentSteps = pipeline.getAgentSteps()
    const toolCalls = agentSteps.filter(output => output.type === "tool")
    const toolsUsed = toolCalls.map(call => call.name)

    // TODO: console.log of entire agentSteps suggests debugging output left in test.
    // should either remove or convert to proper test assertions that verify the
    // structure and content of agentSteps.
    console.log(JSON.stringify(agentSteps, null, 2))

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
