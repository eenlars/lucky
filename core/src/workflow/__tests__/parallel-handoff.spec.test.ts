import {
  extractTextFromPayload,
  type AggregatedPayload,
} from "@core/messages/MessagePayload"
import { WorkFlowNode } from "@core/node/WorkFlowNode"
import { Messages } from "@core/utils/persistence/message/main"
import { Workflow } from "@core/workflow/Workflow"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { getDefaultModels } from "@runtime/settings/models"
import { beforeAll, describe, expect, it, vi } from "vitest"

// Minimal end-to-end test that covers parallel fan-out using the new HandoffMessageHandler.
// No mocks; will hit real sendAI according to configured environment.

describe("Parallel handoff integration", () => {
  // Prevent DB writes for this test only (typed and robust against refactors)
  beforeAll(() => {
    vi.spyOn(Messages, "save").mockResolvedValue()
    vi.spyOn(Messages, "update").mockResolvedValue()
  })

  it("fans out distinct messages to two workers and aggregates at join", async () => {
    // Capture invoke call arguments per node for later assertions
    type InvokeArgs = Parameters<WorkFlowNode["invoke"]>[0]
    const callArgsByNode: Record<string, InvokeArgs[]> = {}

    // Replace WorkFlowNode.create to avoid real tool initialization and LLM calls
    const createSpy = vi
      .spyOn(WorkFlowNode, "create")
      .mockImplementation(async (config) => {
        const nodeId = config.nodeId
        const mkReply = (text: string) => ({
          kind: "result" as const,
          berichten: [{ type: "text", text }],
        })
        return {
          nodeId,
          toConfig: () => config,
          invoke: async (args: InvokeArgs) => {
            if (!callArgsByNode[nodeId]) callArgsByNode[nodeId] = []
            callArgsByNode[nodeId].push(args)
            const base = {
              nodeInvocationId: `${nodeId}-inv-1`,
              usdCost: 0,
              agentSteps: [],
              updatedMemory: undefined,
              error: undefined,
              summaryWithInfo: {
                timestamp: Date.now(),
                nodeId,
                summary: `${nodeId} ok`,
              },
            }
            if (nodeId === "start") {
              return {
                ...base,
                nodeInvocationFinalOutput: "split",
                replyMessage: mkReply("split"),
                nextIds: ["workerA", "workerB"],
                outgoingMessages: [],
              }
            }
            if (nodeId === "workerA") {
              return {
                ...base,
                nodeInvocationFinalOutput: "A: ALPHA",
                replyMessage: mkReply("A: ALPHA"),
                nextIds: ["join"],
                outgoingMessages: [],
              }
            }
            if (nodeId === "workerB") {
              return {
                ...base,
                nodeInvocationFinalOutput: "B: BETA",
                replyMessage: mkReply("B: BETA"),
                nextIds: ["join"],
                outgoingMessages: [],
              }
            }
            if (nodeId === "join") {
              return {
                ...base,
                nodeInvocationFinalOutput: "done",
                replyMessage: mkReply("done"),
                nextIds: ["end"],
                outgoingMessages: [],
              }
            }
            return {
              ...base,
              nodeInvocationFinalOutput: "ok",
              replyMessage: mkReply("ok"),
              nextIds: ["end"],
              outgoingMessages: [],
            }
          },
        } as unknown as WorkFlowNode
      })

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

    await wf.prepareWorkflow(evaluation, "none")

    const { success, data: results, error } = await wf.run()
    expect(success).toBe(true)
    expect(error).toBeUndefined()
    expect(results?.length).toBeGreaterThan(0)

    const first = results![0].queueRunResult
    // Ensure we produced an output string
    expect(typeof first.finalWorkflowOutput).toBe("string")

    // Verify that the join node received an aggregated payload from both workers
    const joinInvocations = callArgsByNode["join"] ?? []
    expect(joinInvocations.length).toBeGreaterThan(0)
    const joinIncoming = joinInvocations[0].workflowMessageIncoming
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

    // Critical: waitFor must cause a single invocation of the join node (no premature invocations)
    expect(joinInvocations.length).toBe(1)

    // Sanity: upstream nodes should each invoke exactly once
    expect((callArgsByNode["start"] ?? []).length).toBe(1)
    expect((callArgsByNode["workerA"] ?? []).length).toBe(1)
    expect((callArgsByNode["workerB"] ?? []).length).toBe(1)
  }, 5_000)
})
