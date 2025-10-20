import type { ProcessedResponse } from "@core/messages/api/vercel/processResponse.types"
import { describe, expect, it, vi } from "vitest"
import type { NodeInvocationCallContext } from "../../messages/pipeline/input.types"
import { handleSuccess } from "../responseHandler"

// Mock dependencies
vi.mock("@core/messages/api/processResponse", () => ({
  getResponseContent: vi.fn().mockReturnValue("test output"),
}))

vi.mock("@core/utils/validation/message", () => ({
  validateAndDecide: vi.fn().mockResolvedValue({
    shouldProceed: true,
    validationError: null,
    validationCost: 0,
  }),
}))

vi.mock("@core/utils/persistence/node/saveNodeInvocation", () => ({
  saveNodeInvocationToDB: vi.fn().mockResolvedValue({
    nodeInvocationId: "test-invocation-id",
  }),
}))

vi.mock("@core/messages/handoffs/main", () => ({
  chooseHandoff: vi.fn().mockResolvedValue({
    handoff: "next-node",
    usdCost: 0.01,
    replyMessage: { kind: "sequential", prompt: "test" },
  }),
}))

vi.mock("@core/messages/summaries", () => ({
  formatSummary: vi.fn().mockReturnValue("formatted summary"),
}))

vi.mock("@core/utils/logging/Logger", () => ({
  lgg: {
    onlyIf: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@examples/settings/constants", () => ({
  CONFIG: {
    logging: { override: { Tools: false } },
    coordinationType: "sequential",
    workflow: { handoffContent: "full" },
  },
}))

describe("responseHandler - Parallel Handoff Logic", () => {
  // TODO: this test has good structure and tests specific handoff logic scenarios.
  // however, it only tests the happy path. missing tests for error conditions,
  // validation failures, edge cases like empty handoffs array, or when chooseHandoff
  // fails. also doesn't test the actual message content or cost calculations.
  const createMockContext = (
    handOffType?: "conditional" | "sequential" | "parallel",
    handOffs: string[] = ["node1", "node2"],
  ): NodeInvocationCallContext => ({
    startTime: new Date().toISOString(),
    workflowMessageIncoming: {
      messageId: "test-message-id",
      toNodeId: "test-node",
      fromNodeId: "start",
      payload: { kind: "sequential", prompt: "test" },
    } as any,
    workflowInvocationId: "test-workflow-invocation-id",
    workflowVersionId: "test-version-id",
    nodeConfig: {
      nodeId: "test-node",
      handOffs,
      handOffType,
      description: "test description",
      systemPrompt: "test system prompt",
      gatewayModelId: "gpt-4o-mini",
      gateway: "openai-api",
      mcpTools: [],
      codeTools: [],
      waitingFor: [],
    },
    nodeMemory: {},
    mainWorkflowGoal: "test goal",
    workflowFiles: [],
    expectedOutputType: undefined,
    workflowId: "test-workflow-id",
    workflowConfig: undefined,
  })

  const createMockResponse = (): ProcessedResponse => ({
    type: "text",
    nodeId: "test-node",
    content: "test output",
    cost: 0.05,
    summary: "test summary",
    agentSteps: [{ type: "text", return: "test output" }],
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
