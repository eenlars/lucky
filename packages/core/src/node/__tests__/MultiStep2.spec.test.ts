import { getDefaultModels } from "@core/core-config/coreConfig"
import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import type { NodeInvocationCallContext } from "@core/messages/pipeline/input.types"
import { describe, expect, it } from "vitest"
import { InvocationPipeline } from "../../messages/pipeline/InvocationPipeline"
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

const model = getDefaultModels().medium

describe("MultiStep2 integration - todoRead and todoWrite", () => {
  // TODO: this test appears to be an integration test that makes real database calls
  // and potentially real AI calls. it should be marked as integration test and not
  // run with unit tests. also, it's testing multi-step execution but doesn't verify
  // the quality of execution, just that tools were called in order.
  const setupTestWorkflow = async (workflowInvocationId: string, workflowVersionId: string, _nodeId: string) => {
    const { createWorkflowInvocation, createWorkflowVersion, ensureWorkflowExists } = await import(
      "@core/utils/persistence/workflow/registerWorkflow"
    )

    const workflowId = "multistep2-test-workflow"

    await ensureWorkflowExists(undefined, "MultiStep2 test workflow", workflowId)
    await createWorkflowVersion({
      persistence: undefined,
      workflowVersionId,
      workflowConfig: { nodes: [], entryNodeId: "test" },
      commitMessage: "MultiStep2 test version",
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
    const workflowInvocationId = `multistep2-test-${Date.now()}`
    const workflowVersionId = "multistep2-v1"
    const nodeId = "multistep2-test-node"

    await setupTestWorkflow(workflowInvocationId, workflowVersionId, nodeId)

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
      nodeConfig: {
        nodeId,
        handOffs: ["end"],
        description: "MultiStep2 test node with todo tools",
        systemPrompt: "First, read the current todos. Then write a new todo item: 'Complete integration test'.",
        modelName: model,
        codeTools: [],
        mcpTools: [],
        waitingFor: [],
      },
      nodeMemory: {},
      mainWorkflowGoal: "Test MultiStep2 with todo workflow",
      workflowFiles: [],
      expectedOutputType: undefined,
      workflowId: "multistep2-test-workflow",
      workflowConfig: undefined,
      skipDatabasePersistence: true,
    }

    const toolManager = new ToolManager("multistep2-test", [], ["todoRead", "todoWrite"], workflowVersionId)

    const pipeline = new InvocationPipeline(context, toolManager)

    await pipeline.prepare()
    await pipeline.execute()
    const result = await pipeline.process()

    expect(result).toBeDefined()
    if (result.error) {
      throw new Error(`Pipeline execution failed: ${result.error.message}`)
    }

    // TODO: this test only verifies tool execution order, not whether tools executed
    // correctly or produced expected results. should verify that todoRead actually
    // returned todo items and todoWrite actually created the specified todo.
    // also doesn't test error cases or edge conditions.
    // extract tool usage
    const agentSteps = pipeline.getAgentSteps()
    const toolCalls = agentSteps.filter(output => output.type === "tool")
    const toolsUsed = toolCalls.map(call => call.name)

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
