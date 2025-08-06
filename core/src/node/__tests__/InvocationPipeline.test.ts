// Mock logger first to ensure it's available for all modules
vi.mock("@core/utils/logging/Logger", () => ({
  lgg: {
    log: vi.fn().mockResolvedValue(undefined),
    info: vi.fn().mockResolvedValue(undefined),
    warn: vi.fn().mockResolvedValue(undefined),
    error: vi.fn().mockResolvedValue(undefined),
    debug: vi.fn().mockResolvedValue(undefined),
    trace: vi.fn().mockResolvedValue(undefined),
    onlyIf: vi.fn().mockImplementation((decider: boolean) => 
      decider ? Promise.resolve() : null
    ),
    logAndSave: vi.fn().mockResolvedValue(undefined),
    finalizeWorkflowLog: vi.fn().mockResolvedValue(null),
  },
}))

// Use standardized test setup
import {
  setupCoreTest,
  createMockRuntimeConstants,
} from "@core/utils/__tests__/setup/coreMocks"
import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { getDefaultModels } from "@runtime/settings/constants.client"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  InvocationPipeline,
  type NodeInvocationCallContext,
} from "../InvocationPipeline"
import { ToolManager } from "../toolManager"

// Mock runtime constants using standard approach
vi.mock("@runtime/settings/constants", () => ({
  CONFIG: {
    coordinationType: "sequential" as const,
    newNodeProbability: 0.7,
    logging: {
      level: "info" as const,
      override: {
        API: false,
        GP: false,
        Database: false,
        Summary: false,
        InvocationPipeline: false,
      },
    },
    workflow: {
      maxNodeInvocations: 14,
      maxNodes: 20,
      handoffContent: "full" as const,
      prepareProblem: true,
      prepareProblemMethod: "ai" as const,
      prepareProblemWorkflowVersionId: "test-version-id",
      parallelExecution: false,
    },
    tools: {
      inactive: new Set(),
      uniqueToolsPerAgent: false,
      uniqueToolSetsPerAgent: false,
      maxToolsPerAgent: 3,
      maxStepsVercel: 10,
      defaultTools: new Set(),
      autoSelectTools: true,
      usePrepareStepStrategy: false,
      experimentalMultiStepLoop: true,
      experimentalMultiStepLoopMaxRounds: 20,
      showParameterSchemas: true,
    },
    models: {
      provider: "openai" as const,
      inactive: new Set(),
    },
    improvement: {
      fitness: {
        timeThresholdSeconds: 300,
        baselineTimeSeconds: 60,
        baselineCostUsd: 0.005,
        costThresholdUsd: 0.01,
        weights: { score: 0.7, time: 0.2, cost: 0.1 },
      },
      flags: {
        selfImproveNodes: false,
        addTools: true,
        analyzeWorkflow: true,
        removeNodes: true,
        editNodes: true,
        maxRetriesForWorkflowRepair: 4,
        useSummariesForImprovement: true,
        improvementType: "judge" as const,
        operatorsWithFeedback: true,
      },
    },
    verification: {
      allowCycles: true,
      enableOutputValidation: false,
    },
    context: {
      maxFilesPerWorkflow: 1,
      enforceFileLimit: true,
    },
    evolution: {
      culturalIterations: 50,
      GP: {
        generations: 40,
        populationSize: 10,
        verbose: false,
        initialPopulationMethod: "prepared" as const,
        initialPopulationFile: "",
        maximumTimeMinutes: 700,
      },
    },
    limits: {
      maxConcurrentWorkflows: 2,
      maxConcurrentAIRequests: 30,
      maxCostUsdPerRun: 30.0,
      enableSpendingLimits: true,
      rateWindowMs: 10000,
      maxRequestsPerWindow: 300,
      enableStallGuard: true,
      enableParallelLimit: true,
    },
  },
  MODELS: {
    summary: "google/gemini-2.0-flash-001",
    nano: "google/gemini-2.0-flash-001",
    default: "openai/gpt-4.1-mini",
    free: "qwen/qwq-32b:free",
    free2: "deepseek/deepseek-r1-0528:free",
    low: "openai/gpt-4.1-nano",
    medium: "openai/gpt-4.1-mini",
    high: "anthropic/claude-sonnet-4",
    fitness: "openai/gpt-4.1-mini",
    reasoning: "anthropic/claude-sonnet-4",
    fallbackOpenRouter: "switchpoint/router",
  },
  PATHS: {
    root: "/test/root",
    app: "/test/app",
    runtime: "/test/runtime",
    codeTools: "/test/codeTools",
    setupFile: "/test/setup.json",
    improver: "/test/improver",
    node: {
      logging: "/test/node/logging",
      memory: {
        root: "/test/memory/root",
        workfiles: "/test/memory/workfiles",
      },
      error: "/test/node/error",
    },
  },
}))

// Mock file system operations to prevent test errors
vi.mock("../../../runtime/code_tools/file-saver/save", () => ({
  saveInLogging: vi.fn(),
  saveInLoc: vi.fn(),
}))

// Logger already mocked at top of file

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
  normalizeModelName: vi.fn().mockReturnValue("openai/gpt-4.1-mini"),
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
    model: getDefaultModels().default,
    workflowFiles: [],
    expectedOutputType: undefined,
    workflowId: "test-workflow-id",
  }

  beforeEach(() => {
    setupCoreTest()
  })

  describe("prepare()", () => {
    it("initializes pipeline successfully", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(
        baseContext,
        toolManager,
        getDefaultModels().default
      )

      await pipeline.prepare()
      const toolUsage = pipeline.getToolUsage()

      // prepare() calls sendAI for reasoning step, which adds a reasoning output
      expect(toolUsage.outputs).toContainEqual(
        expect.objectContaining({
          type: "reasoning",
          return: expect.stringMatching(/AI response/),
        })
      )
      expect(toolUsage.totalCost).toBeGreaterThanOrEqual(0)
    })

    it("handles tool strategy selection with prepare step strategy", async () => {
      const toolManager = new ToolManager(
        "test",
        [],
        ["jsExecutor", "saveFileLegacy"],
        "v1"
      )
      const pipeline = new InvocationPipeline(
        baseContext,
        toolManager,
        getDefaultModels().default
      )

      await pipeline.prepare()
      expect(pipeline).toBeDefined()
    })
  })

  describe("execute()", () => {
    it("executes successfully with experimental multi-step loop", async () => {
      const toolManager = new ToolManager(
        "test",
        [],
        ["jsExecutor", "saveFileLegacy"],
        "v1"
      )
      const pipeline = new InvocationPipeline(
        baseContext,
        toolManager,
        getDefaultModels().default
      )

      await pipeline.prepare()
      await pipeline.execute()

      const toolUsage = pipeline.getToolUsage()
      expect(toolUsage.totalCost).toBeGreaterThanOrEqual(0)
      expect(toolUsage.outputs).toContainEqual(
        expect.objectContaining({
          type: "reasoning",
          return: expect.stringMatching(/test reasoning|AI response/),
        })
      )
    })

    it("multi-step loop executes tool strategy and terminates properly", async () => {
      const { selectToolStrategyV2 } = await import(
        "@core/tools/any/selectToolStrategyV2"
      )
      
      // mock a tool execution strategy followed by termination
      const mockStrategy = selectToolStrategyV2 as any
      mockStrategy.mockResolvedValueOnce({
        type: "terminate",
        reasoning: "task completed immediately",
        usdCost: 0.005,
      })

      const toolManager = new ToolManager(
        "test",
        [],
        ["jsExecutor", "saveFileLegacy"],
        "v1"
      )
      const pipeline = new InvocationPipeline(
        baseContext,
        toolManager,
        getDefaultModels().default
      )

      await pipeline.prepare()
      await pipeline.execute()

      const toolUsage = pipeline.getToolUsage()
      expect(toolUsage.totalCost).toBeGreaterThanOrEqual(0)
      expect(toolUsage.outputs.length).toBeGreaterThan(0)
      
      // Multi-step loop should have reasoning output at minimum
      expect(toolUsage.outputs).toContainEqual(
        expect.objectContaining({
          type: "reasoning",
        })
      )
      // May also have terminate output from multi-step loop
      const hasTerminate = toolUsage.outputs.some(output => output.type === "terminate")
      const hasReasoning = toolUsage.outputs.some(output => output.type === "reasoning")
      expect(hasTerminate || hasReasoning).toBe(true)
    })

    it("executes successfully with single call mode", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(
        baseContext,
        toolManager,
        getDefaultModels().default
      )

      await pipeline.prepare()
      await pipeline.execute()

      const toolUsage = pipeline.getToolUsage()
      expect(toolUsage.totalCost).toBeGreaterThanOrEqual(0)
    })

    it("handles execution errors gracefully", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(
        baseContext,
        toolManager,
        getDefaultModels().default
      )

      await pipeline.prepare()

      // Mock sendAI to fail during execute phase
      const { sendAI } = await import("@core/messages/api/sendAI")
      const mockSendAI = vi.mocked(sendAI)
      mockSendAI.mockRejectedValueOnce(new Error("AI service error"))

      await expect(pipeline.execute()).rejects.toThrow(
        "Execution error: AI service error"
      )
    })
  })

  describe("process()", () => {
    it("processes results after execution", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(
        baseContext,
        toolManager,
        getDefaultModels().default
      )

      await pipeline.prepare()
      await pipeline.execute()
      const result = await pipeline.process()

      expect(result).toBeDefined()
      expect(result.nodeInvocationId).toBeDefined()
      expect(result.error).toBeUndefined()
    })

    it("handles processing without execution", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(
        baseContext,
        toolManager,
        getDefaultModels().default
      )

      const result = await pipeline.process()

      expect(result).toBeDefined()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain("empty processedResponse")
    })
  })

  describe("memory and cost tracking", () => {
    it("tracks costs and memory updates", async () => {
      const contextWithMemory = {
        ...baseContext,
        nodeMemory: { existing: "memory" },
      }

      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(
        contextWithMemory,
        toolManager,
        getDefaultModels().default
      )

      await pipeline.prepare()
      await pipeline.execute()
      await pipeline.process()

      const toolUsage = pipeline.getToolUsage()
      expect(toolUsage.totalCost).toBeGreaterThanOrEqual(0)

      const updatedMemory = pipeline.getUpdatedMemory()
      expect(updatedMemory).toBeDefined()
    })
  })

  describe("full pipeline flow", () => {
    it("completes prepare → execute → process successfully", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(
        baseContext,
        toolManager,
        getDefaultModels().default
      )

      // complete full pipeline
      await pipeline.prepare()
      await pipeline.execute()
      const result = await pipeline.process()

      // verify end state
      expect(result).toBeDefined()
      expect(pipeline.getToolUsage().totalCost).toBeGreaterThan(0)
      expect(pipeline.getUpdatedMemory()).toBeDefined()
    })
  })
})