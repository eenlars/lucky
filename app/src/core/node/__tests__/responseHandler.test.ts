import type { ProcessedResponse } from "@/core/messages/api/processResponse.types"
import { MODELS } from "@/runtime/settings/constants.client"
import { describe, expect, it, vi } from "vitest"
import type { NodeInvocationCallContext } from "../InvocationPipeline"
import { handleSuccess } from "../responseHandler"

// Mock dependencies
vi.mock("@/core/messages/api/processResponse", () => ({
  getResponseContent: vi.fn().mockReturnValue("test output"),
}))

vi.mock("@/core/utils/validation/message", () => ({
  validateAndDecide: vi.fn().mockResolvedValue({
    shouldProceed: true,
    validationError: null,
    validationCost: 0,
  }),
}))

vi.mock("@/core/utils/persistence/node/saveNodeInvocation", () => ({
  saveNodeInvocationToDB: vi.fn().mockResolvedValue({
    nodeInvocationId: "test-invocation-id",
  }),
}))

vi.mock("@/core/messages/handoffs/main", () => ({
  chooseHandoff: vi.fn().mockResolvedValue({
    handoff: "next-node",
    usdCost: 0.01,
    replyMessage: { kind: "sequential", prompt: "test" },
  }),
}))

vi.mock("@/core/messages/summaries", () => ({
  formatSummary: vi.fn().mockReturnValue("formatted summary"),
}))

vi.mock("@/logger", () => ({
  lgg: {
    onlyIf: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/runtime/settings/constants", () => ({
  CONFIG: {
    logging: { override: { Tools: false } },
    coordinationType: "sequential",
    workflow: { handoffContent: "full" },
  },
}))

describe("responseHandler - Parallel Handoff Logic", () => {
  const createMockContext = (
    handOffType?: "conditional" | "sequential" | "parallel",
    handOffs: string[] = ["node1", "node2"]
  ): NodeInvocationCallContext => ({
    nodeId: "test-node",
    startTime: new Date().toISOString(),
    workflowMessageIncoming: {
      messageId: "test-message-id",
      toNodeId: "test-node",
      fromNodeId: "start",
      payload: { kind: "sequential", prompt: "test" },
    } as any,
    workflowInvocationId: "test-workflow-invocation-id",
    handOffs,
    handOffType,
    nodeDescription: "test description",
    nodeSystemPrompt: "test system prompt",
    replyMessage: null,
    workflowVersionId: "test-version-id",
    mainWorkflowGoal: "test goal",
    model: MODELS.default,
    workflowFiles: [],
    expectedOutputType: undefined,
    workflowId: "test-workflow-id",
  })

  const createMockResponse = (): ProcessedResponse => ({
    type: "text",
    nodeId: "test-node",
    content: "test output",
    cost: 0.05,
    summary: "test summary",
    toolUsage: {
      outputs: [{ type: "text", return: "test output" }],
      totalCost: 0,
    },
  })

  it("should enable parallel processing when handOffType is 'parallel'", async () => {
    const context = createMockContext("parallel", ["node1", "node2"])
    const response = createMockResponse()

    const result = await handleSuccess(context, response, [])

    // Should return both nodes as nextIds for parallel processing
    expect(result.nextIds).toEqual(["node1", "node2"])
    expect(result.replyMessage.kind).toBe("sequential") // Based on CONFIG.coordinationType
  })

  it("should use sequential processing when handOffType is 'sequential'", async () => {
    const context = createMockContext("sequential", ["node1", "node2"])
    const response = createMockResponse()

    const result = await handleSuccess(context, response, [])

    // Should use chooseHandoff and return single node
    expect(result.nextIds).toEqual(["next-node"])
    expect(result.replyMessage.kind).toBe("sequential")
  })

  it("should use sequential processing when handOffType is undefined", async () => {
    const context = createMockContext(undefined, ["node1", "node2"])
    const response = createMockResponse()

    const result = await handleSuccess(context, response, [])

    // Should use chooseHandoff and return single node
    expect(result.nextIds).toEqual(["next-node"])
  })

  it("should use sequential processing when handOffType is 'conditional'", async () => {
    const context = createMockContext("conditional", ["node1", "node2"])
    const response = createMockResponse()

    const result = await handleSuccess(context, response, [])

    // Should use chooseHandoff and return single node
    expect(result.nextIds).toEqual(["next-node"])
  })

  it("should not enable parallel processing when handoffs include 'end'", async () => {
    const context = createMockContext("parallel", ["node1", "end"])
    const response = createMockResponse()

    const result = await handleSuccess(context, response, [])

    // Should use sequential processing even with parallel handOffType
    expect(result.nextIds).toEqual(["next-node"])
  })

  it("should not enable parallel processing when only one handoff", async () => {
    const context = createMockContext("parallel", ["node1"])
    const response = createMockResponse()

    const result = await handleSuccess(context, response, [])

    // Should use sequential processing even with parallel handOffType
    expect(result.nextIds).toEqual(["next-node"])
  })
})
