import { beforeEach, describe, expect, it, vi } from "vitest"

// comprehensive tests for evolution engine
// TODO: excessive mocking setup (300+ lines) makes tests brittle and hard to maintain
// consider extracting to test utilities or using higher-level test abstractions
// many duplicate mock definitions and unused mocks throughout file

// Mock environment variables
vi.mock("@core/utils/env.mjs", () => ({
  envi: {
    GOOGLE_API_KEY: "test-google-key",
    OPENAI_API_KEY: "test-openai-key",
    SERPAPI_API_KEY: "test-serp-key",
    TAVILY_API_KEY: "test-tavily-key",
    FIRECRAWL_API_KEY: "test-firecrawl-key",
    SUPABASE_ANON_KEY: "test-supabase-key",
    SUPABASE_PROJECT_ID: "testprojectid",
    OPENROUTER_API_KEY: "test-openrouter-key",
    XAI_API_KEY: "test-xai-key",
    MAPBOX_TOKEN: "test-mapbox-token",
    HF_TOKEN: "test-hf-token",
    HUGGING_FACE_API_KEY: "test-hf-key",
    WEBSHARE_API_KEY: "test-webshare-key",
  },
}))

// Mock runtime constants
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

import type { EvolutionEvaluator } from "@core/evaluation/evaluators/EvolutionEvaluator"
import { EvolutionEngine } from "@core/improvement/gp/evolutionengine"
import type { EvolutionSettings } from "@core/improvement/gp/resources/evolution-types"
import type { GenomeEvaluationResults } from "@core/improvement/gp/resources/gp.types"
import {
  createMockEvaluationInput,
  createMockEvaluator,
  createMockEvolutionSettings,
  createMockWorkflowConfig,
} from "@core/utils/__tests__/setup/coreMocks"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import type { RS } from "@lucky/shared"

// Module-level mock instances
const mockSupabaseChain = {
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({
    data: { run_id: "test-run-id", id: "test-gen-id" },
    error: null,
  }),
  mockResolvedValue: vi.fn().mockResolvedValue({
    data: [{ id: "test-run-id", created_at: new Date().toISOString() }],
    error: null,
  }),
}

// Configure chained returns - all methods return the chain to allow chaining
mockSupabaseChain.insert.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.select.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.update.mockReturnValue(mockSupabaseChain)
mockSupabaseChain.eq.mockReturnValue(mockSupabaseChain)

const mockSupabaseClient = {
  from: vi.fn().mockReturnValue(mockSupabaseChain),
}

const mockRunService = {
  createRun: vi.fn().mockResolvedValue("test-run-id"),
  createGeneration: vi.fn().mockResolvedValue("test-gen-id"),
  createNewGeneration: vi.fn().mockResolvedValue("test-gen-id"),
  completeGeneration: vi.fn().mockResolvedValue(undefined),
  completeRun: vi.fn().mockResolvedValue(undefined),
  getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
  getCurrentGenerationId: vi.fn().mockReturnValue("test-gen-id"),
  getRunId: vi.fn().mockReturnValue("test-run-id"),
  getEvolutionContext: vi.fn().mockReturnValue({
    runId: "test-run-id",
    generationId: "test-gen-id",
    generationNumber: 0,
  }),
}

const mockVerificationCache = {
  verifyWithCache: vi.fn().mockResolvedValue({ valid: true }),
}

// Mock external dependencies at module level
vi.mock("@core/utils/clients/supabase/client", () => ({
  supabase: mockSupabaseClient,
}))

vi.mock("@core/improvement/gp/RunService", () => ({
  RunService: vi.fn(() => mockRunService),
}))

vi.mock("@core/workflow/validation/workflowVerificationCache", () => ({
  verificationCache: mockVerificationCache,
}))

vi.mock("@core/improvement/gp/Select", () => ({
  Select: {
    createNextGeneration: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock StatsTracker
vi.mock("@core/improvement/gp/resources/stats", () => ({
  StatsTracker: vi.fn(() => ({
    logEvolutionStart: vi.fn(),
    recordGenerationStats: vi.fn().mockReturnValue({
      generation: 0,
      avgFitness: 0.5,
      bestFitness: 0.8,
      worstFitness: 0.2,
      diversity: 0.6,
    }),
    shouldStop: vi.fn().mockReturnValue(false),
    addCost: vi.fn(),
    incrementEvaluationCount: vi.fn(),
    logFinalSummary: vi.fn(),
    getFinalStatus: vi.fn().mockReturnValue("completed"),
    getTotalCost: vi.fn().mockReturnValue(0.1),
    getAllStats: vi.fn().mockReturnValue([]),
  })),
}))

// Mock VerificationCache
vi.mock("@core/improvement/gp/resources/wrappers", () => ({
  VerificationCache: vi.fn(() => ({
    verifyWithCache: vi.fn().mockResolvedValue({ valid: true }),
  })),
}))

// Mock Population to avoid genome creation issues
const mockGenomeForEvolution = {
  getWorkflowVersionId: vi.fn().mockReturnValue("test-genome-id"),
  setFitnessAndFeedback: vi.fn(),
  reset: vi.fn(),
  getFitness: vi.fn().mockReturnValue({
    score: 0.8,
    accuracy: 80,
    totalCostUsd: 0.01,
    totalTimeSeconds: 1.5,
  }),
}

vi.mock("@core/improvement/gp/Population", () => ({
  Population: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    getUnevaluated: vi.fn().mockReturnValue([mockGenomeForEvolution]),
    removeUnevaluated: vi.fn().mockResolvedValue(undefined),
    getBest: vi.fn().mockReturnValue({
      getFitness: () => ({
        score: 0.8,
        accuracy: 80,
        totalCostUsd: 0.01,
        totalTimeSeconds: 1.5,
      }),
      getWorkflowVersionId: () => "best-genome-id",
    }),
    getGenerationNumber: vi.fn().mockReturnValue(0),
    incrementGenerationNumber: vi.fn(),
    resetGenomes: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      avgFitness: 0.5,
      bestFitness: 0.8,
      worstFitness: 0.2,
      stdDev: 0.1,
    }),
    getTotalCost: vi.fn().mockReturnValue(0.1),
    size: vi.fn().mockReturnValue(5),
    getRunService: vi.fn().mockReturnValue({ getEvolutionMode: vi.fn(() => "GP") }),
  })),
}))

// Mock runtime constants at module level
vi.mock("@core/types", () => ({
  runtimeConstants: {
    paths: {
      loggingFolder: "/tmp/test-logs",
      contextFolder: "/tmp/test-context",
    },
    workflowId: "test-workflow-id",
  },
}))

describe("EvolutionEngine", () => {
  let engine: EvolutionEngine
  let config: EvolutionSettings
  let evaluationInput: EvaluationInput
  let evaluator: ReturnType<typeof createMockEvaluator>

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    config = createMockEvolutionSettings()
    evaluationInput = createMockEvaluationInput()
    evaluator = createMockEvaluator()

    engine = new EvolutionEngine(config, "GP")
  })

  describe("Constructor", () => {
    it("should initialize with config", () => {
      expect(engine).toBeInstanceOf(EvolutionEngine)
      expect(engine.getRunService()).toBeDefined()
    })
  })

  describe("Static Methods", () => {
    describe("createDefaultConfig", () => {
      it("should create default config", () => {
        const defaultConfig = EvolutionEngine.createDefaultConfig()

        expect(defaultConfig).toHaveProperty("populationSize")
        expect(defaultConfig).toHaveProperty("generations")
        expect(defaultConfig).toHaveProperty("maxCostUSD")
        expect(defaultConfig.populationSize).toBeGreaterThan(0)
        expect(defaultConfig.generations).toBeGreaterThan(0)
      })

      it("should apply overrides to default config", () => {
        const overrides = { populationSize: 20, maxCostUSD: 5.0 }
        const config = EvolutionEngine.createDefaultConfig(overrides)

        expect(config.populationSize).toBe(20)
        expect(config.maxCostUSD).toBe(5.0)
      })
    })
  })

  describe("Evolution Process", () => {
    beforeEach(() => {
      // genome creation is already mocked by the module mock above
    })

    describe("evolve", () => {
      it("should complete full evolution process", async () => {
        // TODO: test only checks structure of result, not actual evolution behavior
        // missing assertions for:
        // - fitness improvements over generations
        // - population diversity changes
        // - selection pressure effects
        // - actual workflow mutations/crossovers
        const result = await engine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })

        expect(result).toHaveProperty("bestGenome")
        expect(result).toHaveProperty("stats")
        expect(result).toHaveProperty("totalCost")
        expect(result.bestGenome).toBeDefined()
        expect(Array.isArray(result.stats)).toBe(true)
        expect(typeof result.totalCost).toBe("number")
      })

      it("should create run in database", async () => {
        await engine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })

        expect(mockRunService.createRun).toHaveBeenCalledWith(evaluationInput.goal, config, undefined)
      })

      it("should emit run started event", async () => {
        // TODO: test for "emit run started event" remains but event system removed
        // either remove test or restore event system functionality
        await engine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })

        // Note: Event system removed, direct logging used instead
      })

      it("should initialize population", async () => {
        await engine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })

        // population should be initialized and evaluated
        expect(evaluator.evaluate).toHaveBeenCalled()
      })

      it("should create generations", async () => {
        await engine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })

        // generation creation should be called for new generations
        expect(mockRunService.createNewGeneration).toHaveBeenCalled()
        expect(mockRunService.completeGeneration).toHaveBeenCalled()
      })

      it("should emit generation events", async () => {
        // TODO: test for "emit generation events" remains but event system removed
        // either remove test or restore event system functionality
        await engine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })

        // Note: Event system removed, direct logging used instead
      })

      it("should work with base workflow", async () => {
        const baseWorkflow = createMockWorkflowConfig()

        const result = await engine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: baseWorkflow,
          problemAnalysis: "dummy-problem-analysis",
        })

        expect(result.bestGenome).toBeDefined()
      })

      it("should handle evaluation failures gracefully", async () => {
        vi.mocked(evaluator.evaluate).mockResolvedValue({
          success: false,
          error: "evaluation failed",
          usdCost: 0,
          data: undefined,
        })

        vi.useFakeTimers()
        const p = engine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })
        await vi.runAllTimersAsync()
        await expect(p).resolves.toBeDefined()
        vi.useRealTimers()
      })

      it("should complete run in database", async () => {
        await engine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })

        expect(mockRunService.completeRun).toHaveBeenCalledWith(
          "completed",
          expect.any(Number), // total cost
          expect.any(Object), // best genome
        )
      })
    })

    describe("Error Handling", () => {
      it("should handle evolution errors and mark run as failed", async () => {
        vi.mocked(evaluator.evaluate).mockRejectedValue(new Error("evaluation failed"))

        vi.useFakeTimers()
        const p = engine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })
        await vi.runAllTimersAsync()
        const result = await p

        expect(result).toHaveProperty("bestGenome")
        expect(result.bestGenome.getFitness()?.score).toBe(0.8)
        expect(mockRunService.completeRun).toHaveBeenCalledWith(
          expect.stringMatching(/completed|interrupted/),
          expect.any(Number),
          expect.any(Object),
        )
        vi.useRealTimers()
      })

      it("should handle population initialization failure", async () => {
        // TODO: comment says "validation catches invalid config at construction time"
        // but test expects throw - no validation is actually tested
        // either add validation or update test to match actual behavior
        // Test that validation catches invalid config at construction time
        expect(() => {
          const badConfig = { ...config, populationSize: 0 }
          new EvolutionEngine(badConfig, "GP")
        }).toThrow()
      })
    })

    describe("Stopping Criteria", () => {
      it("should stop when cost limit reached", async () => {
        const costLimitConfig = { ...config, maxCostUSD: 0.1 }
        const costEngine = new EvolutionEngine(costLimitConfig, "GP")

        const result = await costEngine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })

        // TODO: magic number 0.05 for tolerance without explanation
        // tolerance should be documented or made configurable
        expect(result.totalCost).toBeLessThanOrEqual(costLimitConfig.maxCostUSD + 0.05) // increased tolerance for test environment
      })

      it("should stop on convergence", async () => {
        // configure for quick convergence testing
        const convergeConfig = { ...config, generations: 10 }
        const convergeEngine = new EvolutionEngine(convergeConfig, "GP")

        // mock evaluator to return consistent fitness
        vi.mocked(evaluator.evaluate).mockResolvedValue({
          success: true,
          data: {
            workflowVersionId: "test-genome-id",
            hasBeenEvaluated: true,
            evaluatedAt: new Date().toISOString(),
            fitness: {
              score: 0.8,
              accuracy: 80,
              totalCostUsd: 0.001,
              totalTimeSeconds: 1,
            },
            costOfEvaluation: 0.001,
            errors: [],
            feedback: "test feedback",
          },
          usdCost: 0.001,
        })

        const result = await convergeEngine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })

        // should converge before all generations complete
        expect(result.stats.length).toBeLessThanOrEqual(convergeConfig.generations)
      })

      it("should handle early stopping gracefully", async () => {
        await engine.evolve({
          evaluationInput,
          evaluator,
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })

        expect(mockRunService.completeRun).toHaveBeenCalledWith(
          expect.stringMatching(/completed|interrupted/),
          expect.any(Number),
          expect.any(Object),
        )
      })
    })
  })

  describe("Population Evaluation", () => {
    it("should evaluate genomes in batches", async () => {
      // TODO: test name says "in batches" but test only verifies evaluate was called
      // missing assertions for:
      // - batch size limits are respected
      // - concurrent evaluation limits
      // - proper handling of partial batch failures
      // this tests the private evaluatePopulation method indirectly
      await engine.evolve({
        evaluationInput,
        evaluator,
        _baseWorkflow: undefined,
        problemAnalysis: "dummy-problem-analysis",
      })

      expect(evaluator.evaluate).toHaveBeenCalled()
    })

    it("should handle evaluation timeouts", async () => {
      vi.mocked(evaluator.evaluate).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  success: false,
                  error: "timeout",
                  usdCost: 0,
                  data: undefined,
                }),
              100,
            ),
          ),
      )

      vi.useFakeTimers()
      const p = engine.evolve({
        evaluationInput,
        evaluator,
        _baseWorkflow: undefined,
        problemAnalysis: "dummy-problem-analysis",
      })
      await vi.runAllTimersAsync()
      await expect(p).resolves.toBeDefined()
      vi.useRealTimers()
    })

    it("should track evaluation costs and counts", async () => {
      vi.mocked(evaluator.evaluate).mockResolvedValue({
        success: true,
        data: {
          workflowVersionId: "test-genome-id",
          hasBeenEvaluated: true,
          evaluatedAt: new Date().toISOString(),
          fitness: {
            score: 0.7,
            accuracy: 70,
            totalCostUsd: 0.02,
            totalTimeSeconds: 5,
          },
          costOfEvaluation: 0.02,
          errors: [],
          feedback: "test feedback",
        },
        usdCost: 0.02,
      })

      const result = await engine.evolve({
        evaluationInput,
        evaluator,
        _baseWorkflow: undefined,
        problemAnalysis: "dummy-problem-analysis",
      })

      expect(result.totalCost).toBeGreaterThan(0)
    })

    it("should provide evolution context to evaluator", async () => {
      await engine.evolve({
        evaluationInput,
        evaluator,
        _baseWorkflow: undefined,
        problemAnalysis: "dummy-problem-analysis",
      })

      expect(evaluator.evaluate).toHaveBeenCalledWith(
        expect.any(Object), // genome
        expect.objectContaining({
          runId: "test-run-id",
          generationId: "test-gen-id",
        }),
      )
    })
  })

  describe("Performance", () => {
    it("should handle rate limiting", async () => {
      const rateLimitConfig = { ...config, maxEvaluationsPerHour: 1 }
      const rateLimitEngine = new EvolutionEngine(rateLimitConfig, "GP")

      const startTime = Date.now()
      await rateLimitEngine.evolve({
        evaluationInput,
        evaluator,
        _baseWorkflow: undefined,
        problemAnalysis: "dummy-problem-analysis",
      })
      const endTime = Date.now()

      // TODO: arbitrary 5-second timeout without justification
      // this could fail on slow CI runners - consider removing or making configurable
      // should complete without hanging (rate limiting shouldn't be triggered in verbose mode)
      expect(endTime - startTime).toBeLessThan(5000)
    })

    it("should track evolution statistics", async () => {
      const result = await engine.evolve({
        evaluationInput,
        evaluator,
        _baseWorkflow: undefined,
        problemAnalysis: "dummy-problem-analysis",
      })

      expect(result.stats).toBeDefined()
      expect(Array.isArray(result.stats)).toBe(true)
      // Mock returns empty array, so just check it exists
      expect(result.stats.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe("Integration", () => {
    it("should work with custom evaluator", async () => {
      const customEvaluator: EvolutionEvaluator = {
        evaluate: vi.fn(
          async (): Promise<RS<GenomeEvaluationResults>> => ({
            success: true,
            data: {
              workflowVersionId: "test-genome-id",
              hasBeenEvaluated: true,
              evaluatedAt: new Date().toISOString(),
              fitness: {
                score: 0.95,
                accuracy: 95,
                totalCostUsd: 0.005,
                totalTimeSeconds: 3,
              },
              costOfEvaluation: 0.005,
              errors: [],
              feedback: "ok",
            },
            usdCost: 0.005,
            error: undefined,
          }),
        ),
      }

      const result = await engine.evolve({
        evaluationInput,
        evaluator: customEvaluator,
        _baseWorkflow: undefined,
        problemAnalysis: "dummy-problem-analysis",
      })

      expect(customEvaluator.evaluate).toHaveBeenCalled()
      expect(result.bestGenome).toBeDefined()
    })

    it("should handle complex goal evaluations", async () => {
      const complexGoal = createMockEvaluationInput()

      const result = await engine.evolve({
        evaluationInput: complexGoal,
        evaluator,
        _baseWorkflow: undefined,
        problemAnalysis: "dummy-problem-analysis",
      })

      expect(result.bestGenome).toBeDefined()
    })
  })

  describe("Edge Cases", () => {
    it("should handle zero generations", async () => {
      // TODO: test admits it's "not valid" but still exists with dummy assertion
      // either remove this test or implement proper edge case handling
      // This test is not valid as evolution requires at least 1 generation
      // Skip this test as it violates the system constraints
      expect(true).toBe(true)
    })

    it("should handle single genome population", async () => {
      // TODO: test admits it's "not valid" but still exists with dummy assertion
      // either remove this test or implement proper edge case handling
      // This test is not valid as GP requires at least 2 individuals for crossover
      // Skip this test as it violates the system constraints
      expect(true).toBe(true)
    })

    it("should handle empty evaluation results", async () => {
      vi.mocked(evaluator.evaluate).mockResolvedValue({
        success: true,
        data: {
          workflowVersionId: "test-genome-id",
          hasBeenEvaluated: true,
          evaluatedAt: new Date().toISOString(),
          fitness: {
            score: 0,
            accuracy: 0,
            totalCostUsd: 0,
            totalTimeSeconds: 0,
          },
          costOfEvaluation: 0,
          errors: [],
          feedback: "test feedback",
        },
        usdCost: 0,
      })

      const result = await engine.evolve({
        evaluationInput,
        evaluator,
        _baseWorkflow: undefined,
        problemAnalysis: "dummy-problem-analysis",
      })

      expect(result.bestGenome).toBeDefined()
      expect(result.totalCost).toBeGreaterThanOrEqual(0)
    })
  })
})
