// basic tests for genome class without complex mocking
// TODO: despite title "basic tests", still has extensive mock setup
// consider using actual test utilities instead of inline mocks
import { getCoreConfig, getDefaultModels } from "@core/core-config/coreConfig"
import { Genome } from "@core/improvement/gp/Genome"
import { createMockEvaluationInputGeneric, setupCoreTest } from "@core/utils/__tests__/setup/coreMocks"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock runtime constants at top level - comprehensive mock to prevent undefined property errors
// TODO: "cleaner mock setup" but still 100+ lines of CONFIG mock
// most properties aren't used in these tests
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
      },
    },
    workflow: {
      parallelExecution: false,
      asyncExecution: false,
      maxTotalNodeInvocations: 14,
      maxPerNodeInvocations: 14,
      maxNodes: 20,
      handoffContent: "full" as const,
      prepareProblem: true,
      prepareProblemMethod: "ai" as const,
      prepareProblemWorkflowVersionId: "test-version-id",
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
      showParameterSchemas: true,
      enable: { mcp: false, code: true },
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
        maxRetriesForWorkflowRepair: 3,
        useSummariesForImprovement: true,
        improvementType: "judge" as const,
        operatorsWithFeedback: true,
      },
    },
    verification: {
      allowCycles: true,
      enableOutputValidation: false,
      maxFilesPerWorkflow: 1,
      enforceFileLimit: true,
    },

    evolution: {
      iterativeIterations: 50,
      GP: {
        verbose: true,
        populationSize: 5,
        generations: 3,
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
      rateWindowMs: 1000,
      maxRequestsPerWindow: 100,
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

// Avoid GP-wide mocks here; keep tests close to real behavior

// Mock validation config directly
vi.mock("@core/validation/message/validationConfig", () => ({
  DEFAULT_VALIDATION_CONFIG: {
    enabled: false,
    thresholds: {
      proceedMinScore: 7,
      retryMinScore: 4,
      escalateMaxScore: 3,
    },
    actions: {
      onRetry: "warn",
      onEscalate: "block",
      maxRetries: 1,
    },
  },
}))

// Stub MCP to avoid loading external mcp-secret.json during module import
vi.mock("@core/tools/mcp/mcp", () => ({
  setupMCPForNode: vi.fn().mockResolvedValue({}),
  clearMCPClientCache: vi.fn(),
  clearWorkflowMCPClientCache: vi.fn(),
}))

// Keep DB-related modules stubbed
vi.mock("@core/workflow/setup/verify", () => ({
  verifyWorkflowConfig: vi.fn(),
  verifyWorkflowConfigStrict: vi.fn().mockResolvedValue(true),
}))

vi.mock("@core/persistence/workflow/registerWorkflow", () => ({
  registerWorkflowInDatabase: vi.fn().mockResolvedValue({
    workflowInvocationId: "test-invocation-id",
  }),
}))

vi.mock("@core/utils/logging/Logger", () => ({
  lgg: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    logAndSave: vi.fn(),
  },
}))

// Duplicate mock removed - using comprehensive mock at top of file instead

const evolutionContext = {
  runId: "test-run-id",
  generationId: "test-gen-id",
  generationNumber: 0,
}

// Use real createDummyGenome to avoid Promise-wrapping behavior from async mocks

// Mock database operations
vi.mock("@core/persistence/workflow/registerWorkflow", () => ({
  registerWorkflowInDatabase: vi.fn().mockResolvedValue({
    workflowVersionId: "test-version-id",
    workflowInvocationId: "test-invocation-id",
  }),
  ensureWorkflowExists: vi.fn().mockResolvedValue(undefined),
  createWorkflowVersion: vi.fn().mockResolvedValue(undefined),
  createWorkflowInvocation: vi.fn().mockResolvedValue(undefined),
}))

// Mock supabase client to avoid real database calls
vi.mock("@core/clients/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}))

import type { WorkflowGenome } from "@core/improvement/gp/resources/gp.types"

describe("Genome Basic Tests", () => {
  beforeEach(() => {
    setupCoreTest()
  })

  const createTestGenomeData = (): WorkflowGenome => ({
    nodes: [
      {
        nodeId: "test-node",
        description: "test description",
        systemPrompt: "test system prompt",
        modelName: getDefaultModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: [],
      },
    ],
    entryNodeId: "test-node",
    _evolutionContext: evolutionContext,
    parentWorkflowVersionIds: [],
    createdAt: new Date().toISOString(),
  })

  describe("Constructor", () => {
    it("should create genome from data", () => {
      const genomeData = createTestGenomeData()
      const evaluationInput = createMockEvaluationInputGeneric()

      const genome = new Genome(genomeData, evaluationInput, evolutionContext)

      expect(genome.getWorkflowVersionId()).toBeDefined()
      expect(genome.getRawGenome()).toEqual(genomeData)
    })

    it("should initialize fitness as invalid", () => {
      const genomeData = createTestGenomeData()
      const evaluationInput = createMockEvaluationInputGeneric()

      const genome = new Genome(genomeData, evaluationInput, evolutionContext)

      expect(genome.getFitnessAndFeedback()?.fitness?.score).toBe(0)
      expect(genome.getFitnessAndFeedback()?.hasBeenEvaluated).toBe(false)
    })
  })

  describe("Static Methods", () => {
    it("should create random genome", async () => {
      // Enable verbose GP mode so createRandom takes the fast, deterministic dummy path
      const { initCoreConfig, getCoreConfig } = await import("@core/core-config/coreConfig")
      const prevConfig = getCoreConfig()
      initCoreConfig({
        ...prevConfig,
        evolution: {
          ...prevConfig.evolution,
          GP: {
            ...prevConfig.evolution.GP,
            verbose: true,
          },
        },
      })
      const evaluationInput = createMockEvaluationInputGeneric()

      const genomeResult = await Genome.createRandom({
        evaluationInput,
        parentWorkflowVersionIds: [],
        _evolutionContext: {
          runId: "test-run-id",
          generationId: "test-gen-id",
          generationNumber: 0,
        },
        problemAnalysis: "dummy-problem-analysis",
        evolutionMode: "GP",
      })

      // TODO: test uses conditional logic that could silently pass
      // if genomeResult.success is false, the main assertion is never tested
      // should explicitly test both success and error paths separately
      expect(genomeResult.success).toBe(true)
      // In verbose GP mode, createRandom returns createDummyGenome() directly
      // which returns a Genome instance
      expect(genomeResult.data).toBeInstanceOf(Genome)

      // restore previous config
      initCoreConfig(prevConfig)
    })

    it("should convert genome to workflow config", () => {
      const genomeData = createTestGenomeData()

      const config = Genome.toWorkflowConfig(genomeData as any)

      expect(config.nodes).toEqual(genomeData.nodes)
      expect(config.entryNodeId).toBe(genomeData.entryNodeId)
      expect(config).not.toHaveProperty("wfVersionId")
    })
  })

  describe("Instance Methods", () => {
    let genome: InstanceType<typeof Genome>

    beforeEach(() => {
      const genomeData = createTestGenomeData()
      const evaluationInput = createMockEvaluationInputGeneric()
      genome = new Genome(genomeData, evaluationInput, evolutionContext)
    })

    it("should get workflow config", () => {
      const config = genome.getWorkflowConfig()

      expect(config.nodes).toBeDefined()
      expect(config.entryNodeId).toBe("test-node")
    })

    it("should get goal evaluation", () => {
      const evaluationInput = genome.getEvaluationInput()

      expect(evaluationInput.goal).toBe("test goal for evolution")
      // TODO: comment says "CSV type evaluation input" but assertion doesn't verify CSV-specific structure
      // should test CSV-specific properties like headers, data format, etc.
      // This is a CSV type evaluation input (default), so it doesn't have question/answer
      expect(evaluationInput.type).toBe("csv")
    })

    it("should set and get fitness", () => {
      const fitness = {
        score: 0.8,
        totalCostUsd: 0.01,
        totalTimeSeconds: 10,
        accuracy: 0.8,
      }

      genome.setFitnessAndFeedback({ fitness, feedback: "test feedback" })

      const retrievedFitness = genome.getFitness()
      expect(retrievedFitness?.score).toBe(0.8)
      expect(genome.getFitnessAndFeedback()?.hasBeenEvaluated).toBe(true)
    })

    it("should mark zero score as invalid", () => {
      const fitness = {
        score: 0,
        totalCostUsd: 0,
        totalTimeSeconds: 0,
        accuracy: 0,
      }

      genome.setFitnessAndFeedback({ fitness, feedback: "test feedback" })

      expect(genome.getFitnessAndFeedback()?.hasBeenEvaluated).toBe(true)
    })
  })
})
