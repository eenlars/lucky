import {
  extractTextFromPayload,
  type AggregatedPayload,
} from "@core/messages/MessagePayload"
import { WorkFlowNode } from "@core/node/WorkFlowNode"
import { Workflow } from "@core/workflow/Workflow"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { getDefaultModels } from "@runtime/settings/models"
import { describe, expect, it, vi } from "vitest"

// Minimal end-to-end test that covers parallel fan-out using the new HandoffMessageHandler.
// No mocks; will hit real sendAI according to configured environment.

describe("Parallel handoff integration", () => {
  it("fans out distinct messages to two workers and aggregates at join", async () => {
    // Spy on node invocation to inspect the incoming message for the join node
    const invokeSpy = vi.spyOn(WorkFlowNode.prototype, "invoke")

    const cfg: WorkflowConfig = {
      nodes: [
        {
          nodeId: "start",
          description: "Start node",
          systemPrompt: "Split the task into two parts: A and B",
          modelName: getDefaultModels().nano,
          mcpTools: [],
          codeTools: [],
          handOffs: ["workerA", "workerB"],
          handOffType: "parallel",
        },
        {
          nodeId: "workerA",
          description: "Worker A",
          systemPrompt:
            "Handle part A. Secret information for A is 'ALPHA'. Reply with a short answer that includes ALPHA.",
          modelName: getDefaultModels().nano,
          mcpTools: [],
          codeTools: [],
          handOffs: ["join"],
        },
        {
          nodeId: "workerB",
          description: "Worker B",
          systemPrompt:
            "Handle part B. Secret information for B is 'BETA'. Reply with a short answer that includes BETA.",
          modelName: getDefaultModels().nano,
          mcpTools: [],
          codeTools: [],
          handOffs: ["join"],
        },
        {
          nodeId: "join",
          description: "Join node",
          systemPrompt: "Aggregate results from A and B and finalize",
          modelName: getDefaultModels().nano,
          mcpTools: [],
          codeTools: [],
          handOffs: ["end"],
          waitingFor: ["workerA", "workerB"],
        },
      ],
      entryNodeId: "start",
    }

    const evaluation = {
      type: "text" as const,
      goal: "Do A and B and return combined",
      question: "Please process parts A and B",
      answer: "",
      workflowId: "parallel-handoff-it",
    }

    const wf = Workflow.create({
      config: cfg,
      evaluationInput: evaluation,
      toolContext: undefined,
    })

    await wf.prepareWorkflow(evaluation, "ai")

    const { success, data: results, error } = await wf.run()
    expect(success).toBe(true)
    expect(error).toBeUndefined()
    expect(results?.length).toBeGreaterThan(0)

    const first = results![0].queueRunResult

    // Ensure we progressed through multiple nodes and produced an output
    expect(first.agentSteps.length).toBeGreaterThan(0)
    expect(typeof first.finalWorkflowOutput).toBe("string")

    // Verify that the join node received an aggregated payload from both workers
    const joinCall = invokeSpy.mock.calls.find((args) => {
      const [arg] = args as Parameters<WorkFlowNode["invoke"]>
      return arg?.workflowMessageIncoming?.toNodeId === "join"
    }) as Parameters<WorkFlowNode["invoke"]> | undefined
    expect(joinCall).toBeTruthy()

    const joinIncoming = (joinCall![0] as Parameters<WorkFlowNode["invoke"]>[0])
      .workflowMessageIncoming
    const payload = joinIncoming.payload as AggregatedPayload
    expect(payload?.kind).toBe("aggregated")
    const fromIds = payload.messages.map((m) => m.fromNodeId)
    expect(fromIds.sort()).toEqual(["workerA", "workerB"].sort())

    // Also verify the aggregated payload contains the secret info from both workers
    const aggregatedTexts = payload.messages.map((m) =>
      extractTextFromPayload(m.payload)
    )
    const combined = aggregatedTexts.join("\n")
    expect(combined).toMatch(/ALPHA/i)
    expect(combined).toMatch(/BETA/i)
  })
})
