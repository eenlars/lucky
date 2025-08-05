import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { MODELS } from "@runtime/settings/constants.client"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  InvocationPipeline,
  type NodeInvocationCallContext,
} from "../InvocationPipeline"
import { ToolManager } from "../toolManager"

// mock external dependencies with simple implementations
vi.mock("@core/messages/api/sendAI", () => ({
  sendAI: vi.fn().mockResolvedValue({
    success: true,
    data: {
      text: "AI response",
      toolCalls: [],
      finishReason: "stop",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    },
    usdCost: 0.01,
  }),
  normalizeModelName: vi.fn().mockReturnValue(MODELS.default),
}))

vi.mock("@core/messages/api/processResponse", () => ({
  processModelResponse: vi.fn().mockReturnValue({
    nodeId: "test-node",
    type: "text",
    content: "test response",
    summary: "test summary",
  }),
  processVercelResponse: vi.fn().mockResolvedValue({
    nodeId: "test-node",
    type: "tool",
    toolUsage: {
      outputs: [
        {
          type: "tool",
          name: "jsExecutor",
          args: {},
          return: "tool execution result",
        },
      ],
      totalCost: 0.01,
    },
  }),
  getFinalOutputNodeInvocation: vi.fn().mockReturnValue({
    nodeId: "test-node",
    type: "text",
    content: "final output",
    summary: "final summary",
  }),
  getResponseContentNodeLogs: vi.fn().mockReturnValue("response content"),
  getResponseContent: vi.fn().mockReturnValue("response content"),
}))

vi.mock("@core/messages/summaries", () => ({
  createSummary: vi.fn().mockResolvedValue({
    summary: "test summary",
    usdCost: 0.005,
  }),
  // MISSING EXPORT: formatSummary was not mocked but is used in responseHandler.ts:157
  // This causes 4 tests to fail: "processes results after execution", "handles processing without execution",
  // "tracks costs and memory updates", "completes prepare → execute → process successfully"
  formatSummary: vi.fn().mockReturnValue("formatted test summary"),
}))

vi.mock("@core/tools/any/selectToolStrategy", () => ({
  selectToolStrategy: vi.fn().mockResolvedValue("auto"),
}))

vi.mock("@core/tools/any/selectToolStrategyV2", () => ({
  selectToolStrategyV2: vi.fn().mockResolvedValue({
    type: "terminate",
    reasoning: "test reasoning",
    usdCost: 0.005,
  }),
}))

vi.mock("@core/node/strategies/MultiStepLoopV2", () => ({
  runMultiStepLoopV2: vi.fn().mockResolvedValue({
    nodeId: "test-node",
    type: "tool",
    toolUsage: {
      outputs: [
        { type: "reasoning", return: "test reasoning" },
        {
          type: "text",
          return: "No action taken based on analysis: test reasoning",
        },
        { type: "learning", return: "test learning" },
        {
          type: "terminate",
          return: {
            nodeId: "test-node",
            type: "text",
            content: "final output",
            summary: "final summary",
          },
          summary: "test quick summary",
        },
      ],
      totalCost: 0.02,
    },
    cost: 0.02,
    summary: "test quick summary",
    learnings: "test learning",
  }),
}))

vi.mock("@core/node/strategies/MultiStepLoopV3", () => ({
  runMultiStepLoopV3: vi.fn().mockResolvedValue({
    nodeId: "test-node",
    type: "tool",
    toolUsage: {
      outputs: [
        { type: "reasoning", return: "test reasoning" },
        {
          type: "text",
          return: "No action taken based on analysis: test reasoning",
        },
        { type: "learning", return: "test learning" },
        {
          type: "terminate",
          return: {
            nodeId: "test-node",
            type: "text",
            content: "final output",
            summary: "final summary",
          },
          summary: "test quick summary",
        },
      ],
      totalCost: 0.02,
    },
    cost: 0.02,
    summary: "test quick summary",
    learnings: "test learning",
  }),
}))

vi.mock("@core/prompts/makeLearning", () => ({
  makeLearning: vi.fn().mockResolvedValue({
    learning: { type: "learning", return: "test learning" },
    updatedMemory: { learned: "something new" },
  }),
}))

vi.mock("@core/utils/persistence/node/saveNodeInvocation", () => ({
  saveNodeInvocationToDB: vi
    .fn()
    .mockResolvedValue({ nodeInvocationId: "test-invocation-id" }),
}))

vi.mock("@core/utils/persistence/message/saveMessage", () => ({
  saveMessage: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
}))

vi.mock("@core/messages/api/genObject", () => ({
  quickSummaryNull: vi.fn().mockResolvedValue("test quick summary"),
}))

describe("InvocationPipeline", () => {
  const baseContext: NodeInvocationCallContext = {
    nodeId: "test-node",
    workflowMessageIncoming: new WorkflowMessage({
      fromNodeId: "start",
      toNodeId: "test-node",
      seq: 1,
      payload: { kind: "sequential", prompt: "test prompt" },
      wfInvId: "wf1",
      originInvocationId: null,
    }),
    workflowInvocationId: "wf1",
    startTime: new Date().toISOString(),
    handOffs: ["node1"],
    nodeDescription: "test node description",
    nodeSystemPrompt: "test system prompt",
    replyMessage: null,
    workflowVersionId: "v1",
    mainWorkflowGoal: "test workflow goal",
    model: MODELS.default,
    workflowFiles: [],
    expectedOutputType: undefined,
    workflowId: "test-workflow-id",
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("prepare()", () => {
    it("initializes pipeline successfully", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(
        baseContext,
        toolManager,
        MODELS.default
      )

      await pipeline.prepare()
      const toolUsage = pipeline.getToolUsage()

      expect(toolUsage.outputs).toEqual([])
      expect(toolUsage.totalCost).toBe(0)
    })

    it("handles tool strategy selection", async () => {
      const { CONFIG } = await import("@runtime/settings/constants")
      const originalStrategy = CONFIG.tools.usePrepareStepStrategy
      const originalMultiStep = CONFIG.tools.experimentalMultiStepLoop

      // temporarily modify config using Object.defineProperty for readonly properties
      Object.defineProperty(CONFIG.tools, "usePrepareStepStrategy", {
        value: true,
        writable: true,
      })
      Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
        value: false,
        writable: true,
      })

      try {
        const toolManager = new ToolManager(
          "test",
          [],
          ["jsExecutor", "saveFileLegacy"],
          "v1"
        )
        const pipeline = new InvocationPipeline(
          baseContext,
          toolManager,
          MODELS.default
        )

        await pipeline.prepare()

        // verify the pipeline was created and prepared
        expect(pipeline).toBeDefined()
      } finally {
        // restore original values
        Object.defineProperty(CONFIG.tools, "usePrepareStepStrategy", {
          value: originalStrategy,
          writable: true,
        })
        Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
          value: originalMultiStep,
          writable: true,
        })
      }
    })
  })

  describe("execute()", () => {
    it("executes successfully with experimental multi-step loop", async () => {
      const { CONFIG } = await import("@runtime/settings/constants")
      const originalMultiStep = CONFIG.tools.experimentalMultiStepLoop

      Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
        value: true,
        writable: true,
      })

      try {
        const toolManager = new ToolManager(
          "test",
          [],
          ["jsExecutor", "saveFileLegacy"],
          "v1"
        )
        const pipeline = new InvocationPipeline(
          baseContext,
          toolManager,
          MODELS.default
        )

        await pipeline.prepare()
        await pipeline.execute()

        const toolUsage = pipeline.getToolUsage()
        expect(toolUsage.totalCost).toBeGreaterThan(0)
        expect(toolUsage.outputs).toContainEqual(
          expect.objectContaining({
            type: "reasoning",
            return: expect.stringContaining("test reasoning"),
          })
        )
      } finally {
        Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
          value: originalMultiStep,
          writable: true,
        })
      }
    })

    it("multi-step loop executes tool strategy and terminates properly", async () => {
      const { CONFIG } = await import("@runtime/settings/constants")
      const { selectToolStrategyV2 } = await import(
        "@core/tools/any/selectToolStrategyV2"
      )
      const originalMultiStep = CONFIG.tools.experimentalMultiStepLoop

      Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
        value: true,
        writable: true,
      })

      // mock a tool execution strategy followed by termination
      const mockStrategy = selectToolStrategyV2 as any
      mockStrategy.mockResolvedValueOnce({
        type: "terminate",
        reasoning: "task completed immediately",
        usdCost: 0.005,
      })

      try {
        // multi-step loop requires multiple tools to be triggered
        const toolManager = new ToolManager(
          "test",
          [],
          ["jsExecutor", "saveFileLegacy"],
          "v1"
        )
        const pipeline = new InvocationPipeline(
          baseContext,
          toolManager,
          MODELS.default
        )

        await pipeline.prepare()
        await pipeline.execute()

        const toolUsage = pipeline.getToolUsage()
        expect(toolUsage.totalCost).toBeGreaterThan(0)

        // verify multi-step loop creates some tool usage
        expect(toolUsage.outputs.length).toBeGreaterThan(0)

        // verify termination happens in multi-step loop
        expect(toolUsage.outputs).toContainEqual(
          expect.objectContaining({
            type: "terminate",
          })
        )
      } finally {
        Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
          value: originalMultiStep,
          writable: true,
        })
      }
    })

    it("executes successfully with single call mode", async () => {
      const { CONFIG } = await import("@runtime/settings/constants")
      const originalMultiStep = CONFIG.tools.experimentalMultiStepLoop

      Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
        value: false,
        writable: true,
      })

      try {
        const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
        const pipeline = new InvocationPipeline(
          baseContext,
          toolManager,
          MODELS.default
        )

        await pipeline.prepare()
        await pipeline.execute()

        const toolUsage = pipeline.getToolUsage()
        expect(toolUsage.totalCost).toBeGreaterThan(0)
      } finally {
        Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
          value: originalMultiStep,
          writable: true,
        })
      }
    })

    it("handles execution errors gracefully", async () => {
      const { CONFIG } = await import("@runtime/settings/constants")
      const originalMultiStep = CONFIG.tools.experimentalMultiStepLoop

      Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
        value: false,
        writable: true,
      })

      const { sendAI } = await import("@core/messages/api/sendAI")
      const mockSendAI = sendAI as any
      mockSendAI.mockRejectedValueOnce(new Error("AI service error"))

      try {
        const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
        const pipeline = new InvocationPipeline(
          baseContext,
          toolManager,
          MODELS.default
        )

        await pipeline.prepare()

        await expect(pipeline.execute()).rejects.toThrow(
          "Execution error: AI service error"
        )
      } finally {
        Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
          value: originalMultiStep,
          writable: true,
        })
      }
    })
  })

  describe("process()", () => {
    it("processes results after execution", async () => {
      const { CONFIG } = await import("@runtime/settings/constants")
      const originalMultiStep = CONFIG.tools.experimentalMultiStepLoop

      Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
        value: false,
        writable: true,
      })

      try {
        const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
        const pipeline = new InvocationPipeline(
          baseContext,
          toolManager,
          MODELS.default
        )

        await pipeline.prepare()
        await pipeline.execute()
        const result = await pipeline.process()

        expect(result).toBeDefined()
        expect(result.nodeInvocationId).toBeDefined()
        expect(result.error).toBeUndefined()
      } finally {
        Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
          value: originalMultiStep,
          writable: true,
        })
      }
    })

    it("handles processing without execution", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(
        baseContext,
        toolManager,
        MODELS.default
      )

      const result = await pipeline.process()

      expect(result).toBeDefined()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain("empty processedResponse")
    })
  })

  describe("memory and cost tracking", () => {
    it("tracks costs and memory updates", async () => {
      const { CONFIG } = await import("@runtime/settings/constants")
      const originalMultiStep = CONFIG.tools.experimentalMultiStepLoop

      Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
        value: false,
        writable: true,
      })

      try {
        const contextWithMemory = {
          ...baseContext,
          nodeMemory: { existing: "memory" },
        }

        const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
        const pipeline = new InvocationPipeline(
          contextWithMemory,
          toolManager,
          MODELS.default
        )

        await pipeline.prepare()
        await pipeline.execute()
        await pipeline.process()

        const toolUsage = pipeline.getToolUsage()
        expect(toolUsage.totalCost).toBeGreaterThan(0)

        const updatedMemory = pipeline.getUpdatedMemory()
        expect(updatedMemory).toBeDefined()
      } finally {
        Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
          value: originalMultiStep,
          writable: true,
        })
      }
    })
  })

  describe("full pipeline flow", () => {
    it("completes prepare → execute → process successfully", async () => {
      const { CONFIG } = await import("@runtime/settings/constants")
      const originalMultiStep = CONFIG.tools.experimentalMultiStepLoop
      const originalStrategy = CONFIG.tools.usePrepareStepStrategy

      Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
        value: false,
        writable: true,
      })
      Object.defineProperty(CONFIG.tools, "usePrepareStepStrategy", {
        value: false,
        writable: true,
      })

      try {
        const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
        const pipeline = new InvocationPipeline(
          baseContext,
          toolManager,
          MODELS.default
        )

        // complete full pipeline
        await pipeline.prepare()
        await pipeline.execute()
        const result = await pipeline.process()

        // verify end state
        expect(result).toBeDefined()
        expect(pipeline.getToolUsage().totalCost).toBeGreaterThan(0)
        expect(pipeline.getUpdatedMemory()).toBeDefined()
      } finally {
        Object.defineProperty(CONFIG.tools, "experimentalMultiStepLoop", {
          value: originalMultiStep,
          writable: true,
        })
        Object.defineProperty(CONFIG.tools, "usePrepareStepStrategy", {
          value: originalStrategy,
          writable: true,
        })
      }
    })
  })
})
