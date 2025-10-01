// Use standardized test setup
import { getDefaultModels } from "@core/core-config/compat"
import { WorkflowMessage } from "@core/messages/WorkflowMessage"
import { setupCoreTest } from "@core/utils/__tests__/setup/coreMocks"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { InvocationPipeline } from "../../messages/pipeline/InvocationPipeline"
import type { NodeInvocationCallContext } from "../../messages/pipeline/input.types"
import { ToolManager } from "../toolManager"

// Mock runtime constants using standard approach
vi.mock("@examples/settings/constants", () => ({
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
      maxTotalNodeInvocations: 14,
      maxPerNodeInvocations: 14,
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
      iterativeIterations: 50,
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
vi.mock("../../../examples/code_tools/file-saver/save", () => ({
  saveInLogging: vi.fn(),
  saveInLoc: vi.fn(),
}))

// Logger already mocked at top of file

// mock external dependencies with simple implementations
// Mock sendAI from the actual import path used in code
vi.mock("@core/messages/api/sendAI/sendAI", () => ({
  sendAI: vi.fn().mockResolvedValue({
    success: true,
    data: {
      text: "AI response",
      // minimal shape to keep downstream logic happy in text mode
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    },
    usdCost: 0.01,
  }),
  normalizeModelName: vi.fn().mockReturnValue("openai/gpt-4.1-mini"),
}))

// Align processResponse mock with actual exported names and shapes
vi.mock("@core/messages/api/processResponse", () => ({
  processResponseVercel: vi.fn().mockReturnValue({
    nodeId: "test-node",
    type: "text",
    content: "response content",
    cost: 0.01,
    summary: "test summary",
    agentSteps: [{ type: "text", return: "response content" }],
  }),
  getFinalOutputNodeInvocation: vi.fn().mockReturnValue("final output"),
  getResponseContentagentSteps: vi.fn().mockReturnValue("response content"),
  getResponseContent: vi.fn().mockReturnValue("response content"),
  formatSummary: vi.fn().mockReturnValue("formatted test summary"),
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

// Use the actual path used by MultiStepLoopV2Helper
vi.mock("@core/messages/pipeline/selectTool/selectToolStrategyV2", () => ({
  selectToolStrategyV2: vi.fn().mockResolvedValue({
    type: "terminate",
    reasoning: "test reasoning",
    usdCost: 0.005,
  }),
}))

// Mock the actual helpers used by InvocationPipeline
vi.mock("@core/messages/pipeline/agentStepLoop/MultiStepLoopV2", () => ({
  runMultiStepLoopV2Helper: vi.fn().mockResolvedValue({
    nodeId: "test-node",
    type: "tool",
    agentSteps: [
      { type: "reasoning", return: "test reasoning" },
      {
        type: "text",
        return: "No action taken based on analysis: test reasoning",
      },
      { type: "learning", return: "test learning" },
      {
        type: "terminate",
        return: "final output",
        summary: "test quick summary",
      },
    ],
    cost: 0.02,
    summary: "test quick summary",
    learnings: "test learning",
  }),
}))

vi.mock("@core/messages/pipeline/agentStepLoop/MultiStepLoopV3", () => ({
  runMultiStepLoopV3Helper: vi.fn().mockResolvedValue({
    processedResponse: {
      nodeId: "test-node",
      type: "tool",
      agentSteps: [
        { type: "reasoning", return: "test reasoning" },
        {
          type: "text",
          return: "No action taken based on analysis: test reasoning",
        },
        { type: "learning", return: "test learning" },
        {
          type: "terminate",
          return: "final output",
          summary: "test quick summary",
        },
      ],
      cost: 0.02,
      summary: "test quick summary",
      learnings: "test learning",
    },
    debugPrompts: ["debug prompt"],
    updatedMemory: { learned: "something new" },
  }),
}))

vi.mock("@core/prompts/makeLearning", () => ({
  makeLearning: vi.fn().mockResolvedValue({
    learning: { type: "learning", return: "test learning" },
    updatedMemory: { learned: "something new" },
  }),
}))

vi.mock("@core/utils/persistence/node/saveNodeInvocation", () => ({
  saveNodeInvocationToDB: vi.fn().mockResolvedValue({ nodeInvocationId: "test-invocation-id" }),
}))

vi.mock("@core/utils/persistence/message/saveMessage", () => ({
  saveMessage: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
}))

vi.mock("@core/messages/api/genObject", () => ({
  quickSummaryNull: vi.fn().mockResolvedValue("test quick summary"),
}))

// Stub response handler to avoid deep logging/handoff and Logger.onlyIf issues
vi.mock("@core/node/responseHandler", () => ({
  handleSuccess: vi
    .fn()
    .mockImplementation(
      (
        _context: any,
        response: any,
        debugPrompts: string[] = [],
        extraCost = 0,
        updatedMemory: any = null,
        agentSteps: any[] = [],
      ) =>
        Promise.resolve({
          nodeInvocationId: "test-invocation-id",
          nodeInvocationFinalOutput: "final output",
          usdCost: (response?.cost ?? 0) + (extraCost ?? 0),
          nextIds: ["end"],
          replyMessage: {
            kind: "result",
            berichten: [{ type: "text", text: "ok" }],
          },
          summaryWithInfo: "summary",
          agentSteps: agentSteps?.length ? agentSteps : (response?.agentSteps ?? [{ type: "text", return: "ok" }]),
          updatedMemory: updatedMemory ?? undefined,
          debugPrompts,
        }),
    ),
  handleError: vi
    .fn()
    .mockImplementation(({ errorMessage, debugPrompts }: { errorMessage: string; debugPrompts: string[] }) =>
      Promise.resolve({
        nodeInvocationId: "error-id",
        nodeInvocationFinalOutput: errorMessage,
        usdCost: 0,
        nextIds: ["end"],
        error: { message: errorMessage },
        summaryWithInfo: errorMessage,
        replyMessage: {
          kind: "result",
          berichten: [{ type: "text", text: errorMessage }],
        },
        agentSteps: [{ type: "text", return: errorMessage }],
        debugPrompts: debugPrompts ?? [],
      }),
    ),
}))

// Avoid deep handoff logic in error path
vi.mock("@core/messages/handoffs/main", () => ({
  chooseHandoff: vi.fn().mockResolvedValue({
    handoff: "end",
    usdCost: 0,
    replyMessage: { kind: "result", berichten: [{ type: "text", text: "" }] },
  }),
}))

describe("InvocationPipeline", () => {
  // TODO: this test suite has extensive mocking that prevents testing real behavior.
  // all AI calls, tool executions, and helper functions are mocked, so tests only
  // verify that mocks are called, not that InvocationPipeline actually works.
  // should consider integration tests with fewer mocks to test real behavior.
  const baseContext: NodeInvocationCallContext = {
    workflowMessageIncoming: new WorkflowMessage({
      fromNodeId: "start",
      toNodeId: "test-node",
      seq: 1,
      payload: {
        kind: "sequential",
        berichten: [{ type: "text", text: "test prompt" }],
      },
      wfInvId: "wf1",
      originInvocationId: null,
      skipDatabasePersistence: true,
    }),
    workflowInvocationId: "wf1",
    workflowVersionId: "test-v1",
    startTime: new Date().toISOString(),
    nodeConfig: {
      nodeId: "test-node",
      handOffs: ["node1"],
      description: "test node description",
      systemPrompt: "test system prompt",
      modelName: getDefaultModels().default,
      codeTools: [],
      mcpTools: [],
      waitingFor: [],
    },
    nodeMemory: {},
    mainWorkflowGoal: "test workflow goal",
    workflowFiles: [],
    expectedOutputType: undefined,
    workflowId: "test-workflow-id",
  }

  beforeEach(() => {
    setupCoreTest()

    // Mock ToolManager to provide at least one tool for multi-step loop
    const mockTool = {
      name: "jsExecutor",
      description: "Execute JavaScript",
      parameters: { type: "object", properties: {} },
      execute: vi.fn().mockResolvedValue({ success: true, data: "executed" }),
    } as any

    // Return a tool only when the ToolManager instance was constructed with tools;
    // when both code and MCP tool lists are empty, return an empty toolset so
    // tests that expect the single-call path (and sendAI mocking) still work.
    vi.spyOn(ToolManager.prototype, "getAllTools").mockImplementation(function (this: any) {
      try {
        const code = this?.codeToolNames ?? []
        const mcp = this?.mcpToolNames ?? []
        const hasAny = (Array.isArray(code) && code.length > 0) || (Array.isArray(mcp) && mcp.length > 0)
        return hasAny ? ({ jsExecutor: mockTool } as any) : ({} as any)
      } catch {
        return { jsExecutor: mockTool } as any
      }
    })
  })

  describe("prepare()", () => {
    it("initializes pipeline successfully", async () => {
      // TODO: this test only verifies that a mocked AI response is added to agentSteps.
      // it doesn't test what prepare() actually does: tool strategy selection, context
      // preparation, or error handling. the assertion is too generic (just checking for
      // "AI response" string) and doesn't verify the quality of preparation.
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(baseContext, toolManager)

      await pipeline.prepare()
      const agentSteps = pipeline.getAgentSteps()

      // prepare() adds a prepare step with model analysis
      expect(agentSteps).toContainEqual(
        expect.objectContaining({
          type: "prepare",
          return: expect.stringMatching(/AI response/),
        }),
      )
    })

    it("handles tool strategy selection with prepare step strategy", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor", "saveFileLegacy"], "v1")
      const pipeline = new InvocationPipeline(baseContext, toolManager)

      await pipeline.prepare()
      expect(pipeline).toBeDefined()
    })
  })

  describe("execute()", () => {
    it("executes successfully with experimental multi-step loop", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor", "saveFileLegacy"], "v1")
      const pipeline = new InvocationPipeline(baseContext, toolManager)

      await pipeline.prepare()
      await pipeline.execute()

      const agentSteps = pipeline.getAgentSteps()
      expect(agentSteps).toContainEqual(
        expect.objectContaining({
          type: "reasoning",
          return: expect.stringMatching(/test reasoning|AI response/),
        }),
      )
    })

    it("multi-step loop executes tool strategy and terminates properly", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor", "saveFileLegacy"], "v1")
      const pipeline = new InvocationPipeline(baseContext, toolManager)

      await pipeline.prepare()
      await pipeline.execute()

      const agentSteps = pipeline.getAgentSteps()
      expect(agentSteps.length).toBeGreaterThan(0)

      // Multi-step loop should have reasoning output at minimum
      expect(agentSteps).toContainEqual(
        expect.objectContaining({
          type: "reasoning",
        }),
      )
      // May also have terminate output from multi-step loop
      const hasTerminate = agentSteps.some(output => output.type === "terminate")
      const hasReasoning = agentSteps.some(output => output.type === "reasoning")
      expect(hasTerminate || hasReasoning).toBe(true)
    })

    it("executes successfully with single call mode", async () => {
      // TODO: this test has no assertions! it runs the code but doesn't verify anything.
      // should at least check that agentSteps contains expected outputs, that no errors
      // occurred, or that the execution completed successfully.
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(baseContext, toolManager)

      await pipeline.prepare()
      await pipeline.execute()

      const agentSteps = pipeline.getAgentSteps()
    })

    it("handles execution errors gracefully", async () => {
      // Force single-call path by having zero tools available
      const toolManager = new ToolManager("test", [], [], "v1")
      const pipeline = new InvocationPipeline(baseContext, toolManager)

      await pipeline.prepare()

      // Mock sendAI to fail during execute phase
      const { sendAI } = await import("@core/messages/api/sendAI/sendAI")
      const mockSendAI = sendAI as unknown as ReturnType<typeof vi.fn>
      ;(mockSendAI as any).mockRejectedValueOnce(new Error("AI service error"))

      await expect(pipeline.execute()).rejects.toThrow("Execution error: AI service error")
    })
  })

  describe("process()", () => {
    it("processes results after execution", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(baseContext, toolManager)

      await pipeline.prepare()
      await pipeline.execute()
      const result = await pipeline.process()

      expect(result).toBeDefined()
      expect(result.nodeInvocationId).toBeDefined()
      expect(result.error).toBeUndefined()
    })

    it("handles processing without execution", async () => {
      // TODO: this test assumes specific error message "empty processedResponse" but
      // doesn't verify this is the actual error behavior. if implementation changes
      // error message, test will fail for wrong reasons. should test error type or
      // more generic error conditions rather than exact message matching.
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(baseContext, toolManager)

      const result = await pipeline.process()

      expect(result).toBeDefined()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain("empty processedResponse")
    })
  })

  describe("memory and cost tracking", () => {
    it("tracks costs and memory updates", async () => {
      // TODO: this test doesn't actually verify cost tracking or memory updates.
      // it only checks that updatedMemory is defined, not that it contains expected
      // values or that costs are calculated correctly. agentSteps variable is created
      // but never used. should verify actual memory changes and cost accumulation.
      const contextWithMemory = {
        ...baseContext,
        nodeMemory: { existing: "memory" },
      }

      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(contextWithMemory, toolManager)

      await pipeline.prepare()
      await pipeline.execute()
      await pipeline.process()

      const agentSteps = pipeline.getAgentSteps()

      const updatedMemory = pipeline.getUpdatedMemory()
      expect(updatedMemory).toBeDefined()
    })
  })

  describe("full pipeline flow", () => {
    it("completes prepare → execute → process successfully", async () => {
      const toolManager = new ToolManager("test", [], ["jsExecutor"], "v1")
      const pipeline = new InvocationPipeline(baseContext, toolManager)

      // complete full pipeline
      await pipeline.prepare()
      await pipeline.execute()
      const result = await pipeline.process()

      // verify end state
      expect(result).toBeDefined()
      expect(pipeline.getAgentSteps().length).toBeGreaterThan(0)
      expect(pipeline.getUpdatedMemory()).toBeDefined()
    })
  })
})
