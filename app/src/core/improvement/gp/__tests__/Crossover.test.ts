// tests for crossover operations
import type { EvolutionContext } from "@/core/improvement/gp/resources/types"
import {
  createMockCrossoverParams,
  createMockGenome,
  createMockWorkflowConfig,
  mockSuccessfulAIResponse,
  setupCoreTest,
} from "@/core/utils/__tests__/setup/coreMocks"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Create mock instances directly
const mockVerifyWorkflowConfigStrict = vi.fn()
const mockRegisterCrossover = vi.fn()
const mockLggLog = vi.fn()
const mockLggError = vi.fn()
const mockWorkflowConfigToGenome = vi.fn()

// Mock external dependencies using vi.mock
vi.mock("@/core/workflow/actions/generate/formalizeWorkflow", () => ({
  formalizeWorkflow: vi.fn(),
}))

vi.mock("@/core/utils/validation/workflow", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("@/core/utils/validation/workflow")>()
  return {
    ...mod,
    verifyWorkflowConfig: mockVerifyWorkflowConfigStrict,
  }
})

vi.mock("@/core/utils/logging/Logger", () => ({
  lgg: {
    log: mockLggLog,
    error: mockLggError,
  },
}))

// Mock runtime constants at top level
vi.mock("@/runtime/settings/constants", () => ({
  CONFIG: {
    coordinationType: "sequential",
    newNodeProbability: 0.7,
    logging: {
      level: "info",
      override: {
        API: false,
        GP: false,
        Database: false,
      },
    },
    workflow: {
      maxNodeInvocations: 14,
      maxNodes: 20,
      handoffContent: "full",
      prepareProblem: true,
      prepareProblemMethod: "ai",
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
    },
    models: {
      provider: "openai",
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
        improvementType: "judge",
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
        verbose: true, // Override for testing
        initialPopulationMethod: "prepared",
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

vi.mock("@/core/improvement/GP/OperatorRegistry", () => ({
  OperatorRegistry: {
    registerCrossover: mockRegisterCrossover,
  },
}))

vi.mock("@improvement/GP/resources/wrappers", () => ({
  workflowConfigToGenome: mockWorkflowConfigToGenome,
}))

vi.mock("@/core/improvement/gp/resources/debug/dummyGenome", () => ({
  createDummyGenome: vi
    .fn()
    .mockImplementation((parentIds, evolutionContext) => ({
      getWorkflowVersionId: () => "dummy-genome-id",
      getWorkflowConfig: () => createMockWorkflowConfig(),
      getFitness: () => ({ score: 0.5, valid: true }),
      parentWorkflowVersionIds: parentIds,
      evolutionContext,
    })),
}))

vi.mock("@gp/operators/crossoverStrategy", () => ({
  getCrossoverVariability: vi.fn(() => ({
    aggressiveness: "medium",
    intensity: 0.5,
  })),
  selectCrossoverType: vi.fn(() => "behavioralBlend"),
}))

vi.mock("@gp/resources/tracker", () => ({
  failureTracker: {
    trackCrossoverFailure: vi.fn(),
  },
}))

const evolutionContext: EvolutionContext = {
  runId: "test-run-id",
  generationId: "test-gen-id",
  generationNumber: 0,
}

// Mock config is handled by consolidated mocks

describe("Crossover", () => {
  let mockFormalizeWorkflow: any

  beforeEach(async () => {
    vi.clearAllMocks()
    setupCoreTest()

    // Get the mocked function from the module
    const { formalizeWorkflow } = await import(
      "@/core/workflow/actions/generate/formalizeWorkflow"
    )
    mockFormalizeWorkflow = vi.mocked(formalizeWorkflow)

    // Set up default mock implementations
    mockFormalizeWorkflow.mockResolvedValue({
      data: createMockWorkflowConfig(),
      error: undefined,
    })
    mockVerifyWorkflowConfigStrict.mockResolvedValue({
      isValid: true,
      errors: [],
    })
    mockRegisterCrossover.mockReturnValue(undefined)
    mockWorkflowConfigToGenome.mockImplementation(async () => {
      return {
        data: await createMockGenome(),
        error: undefined,
        usdCost: 0.01,
      }
    })
  })

  describe("crossover", () => {
    it("should perform crossover in verbose mode", async () => {
      // Verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )
      const { createDummyGenome } = await import(
        "@/core/improvement/gp/resources/debug/dummyGenome"
      )

      const params = createMockCrossoverParams({
        parents: [
          createDummyGenome([], evolutionContext),
          createDummyGenome([], evolutionContext),
        ],
        verbose: true,
      })

      const response = await Crossover.crossover(params)

      if (!response.success || !response.data) {
        throw new Error("Crossover failed")
      }

      expect(response.data).toBeDefined()
      expect(response.data.genome.parentWorkflowVersionIds.length).toBe(2)
      expect(mockFormalizeWorkflow).not.toHaveBeenCalled() // verbose mode skips AI
    })

    it("should handle empty parents array in verbose mode", async () => {
      // Import the module after mocks are set up
      const CrossoverModule = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )
      const { Crossover } = CrossoverModule

      const params = createMockCrossoverParams({
        parents: [],
        verbose: true,
      })

      // In verbose mode, even with empty parents, it should create a dummy genome
      const response = await Crossover.crossover(params)

      expect(response).toBeDefined()
      expect(response.success).toBe(true)
      expect(response.data?.genome.parentWorkflowVersionIds).toEqual([])
    })

    it("should handle single parent in verbose mode", async () => {
      // Verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )
      const { createDummyGenome } = await import(
        "@/core/improvement/gp/resources/debug/dummyGenome"
      )

      const params = createMockCrossoverParams({
        parents: [createDummyGenome([], evolutionContext)],
      })

      const response = await Crossover.crossover(params)

      if (!response.success || !response.data) {
        throw new Error("Crossover failed")
      }

      expect(response.data.genome.parentWorkflowVersionIds.length).toBe(1)
    })

    it("should handle multiple parents in verbose mode", async () => {
      // Verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )
      const { createDummyGenome } = await import(
        "@/core/improvement/gp/resources/debug/dummyGenome"
      )

      const params = createMockCrossoverParams({
        parents: [
          createDummyGenome([], evolutionContext),
          createDummyGenome([], evolutionContext),
        ],
      })

      const response = await Crossover.crossover(params)

      if (!response.success || !response.data) {
        throw new Error("Crossover failed")
      }

      expect(response.data).toBeDefined()
      expect(response.data.genome.parentWorkflowVersionIds.length).toBe(2)
    })

    it("should create genome with correct generation", async () => {
      // Verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )
      const { createDummyGenome } = await import(
        "@/core/improvement/gp/resources/debug/dummyGenome"
      )

      const params = createMockCrossoverParams({
        parents: [
          createDummyGenome([], evolutionContext),
          createDummyGenome([], evolutionContext),
        ],
      })

      const response = await Crossover.crossover(params)

      if (!response.success || !response.data) {
        throw new Error("Crossover failed")
      }

      expect(response.data.genome.parentWorkflowVersionIds.length).toBe(2)
    })

    it("should perform LLM-based crossover in non-verbose mode", async () => {
      // Non-verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )

      const mockWorkflowConfig = createMockWorkflowConfig()
      mockFormalizeWorkflow.mockResolvedValue(
        mockSuccessfulAIResponse(mockWorkflowConfig)
      )

      const params = createMockCrossoverParams({ verbose: false })
      const response = await Crossover.crossover(params)

      if (!response.success || !response.data) {
        throw new Error("Crossover failed")
      }

      expect(mockFormalizeWorkflow).toHaveBeenCalledWith(
        expect.stringContaining("crossover"),
        expect.objectContaining({
          workflowConfig: expect.any(Object),
        })
      )

      expect(mockVerifyWorkflowConfigStrict).toHaveBeenCalledWith(
        mockWorkflowConfig,
        expect.objectContaining({
          throwOnError: false,
          verbose: false,
        })
      )

      if (!response.success || !response.data) {
        throw new Error("Crossover failed")
      }

      expect(response.data.genome.parentWorkflowVersionIds.length).toBe(2)
    })

    it("should handle AI request failure", async () => {
      // Non-verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )

      mockFormalizeWorkflow.mockResolvedValue({
        data: undefined,
        error: "AI request failed",
      })

      const params = createMockCrossoverParams({ verbose: false })
      await expect(Crossover.crossover(params)).rejects.toThrow(
        "formalizeWorkflow returned no valid workflow"
      )
    })

    it("should handle verification failure", async () => {
      // Non-verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )

      const mockWorkflowConfig = { nodes: [], entryNodeId: "invalid" }
      mockFormalizeWorkflow.mockResolvedValue({
        data: mockWorkflowConfig,
        error: undefined,
      })
      mockVerifyWorkflowConfigStrict.mockResolvedValue({
        isValid: false,
        errors: ["verification failed"],
      })

      const params = createMockCrossoverParams({ verbose: false })
      await expect(Crossover.crossover(params)).rejects.toThrow(
        "Crossover failed: invalid workflow after verifying"
      )
    })

    it("should use crossover strategy in prompt", async () => {
      // Non-verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )

      const strategy = "blend genetic features"
      mockFormalizeWorkflow.mockResolvedValue({
        data: createMockWorkflowConfig(),
        error: undefined,
      })

      const params = createMockCrossoverParams({
        crossoverStrategy: strategy,
        verbose: false,
      })
      await Crossover.crossover(params)

      expect(mockFormalizeWorkflow).toHaveBeenCalledWith(
        expect.stringContaining(strategy),
        expect.any(Object)
      )
    })

    it("should handle empty parents array", async () => {
      // Verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )

      const params = createMockCrossoverParams({
        parents: [],
      })
      const response = await Crossover.crossover(params)

      if (!response.success || !response.data) {
        throw new Error("Crossover failed")
      }

      expect(response.data?.genome.parentWorkflowVersionIds).toEqual([])
    })
  })

  describe("llmCrossover", () => {
    it("should be compatible with operator registry", async () => {
      // Verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )

      const params = createMockCrossoverParams({ verbose: true })
      const response = await Crossover.crossover(params)

      if (!response.success || !response.data) {
        throw new Error("Crossover failed")
      }

      expect(response.data.genome.parentWorkflowVersionIds.length).toBe(2)
    })
  })

  describe("Error Handling", () => {
    it("should handle malformed AI response", async () => {
      // Non-verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )

      mockFormalizeWorkflow.mockResolvedValue({
        data: null,
        error: undefined,
      })

      const params = createMockCrossoverParams({ verbose: false })
      await expect(Crossover.crossover(params)).rejects.toThrow()
    })

    it("should handle AI request timeout", async () => {
      // Non-verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )

      mockFormalizeWorkflow.mockRejectedValue(new Error("Request timeout"))

      const params = createMockCrossoverParams({ verbose: false })
      await expect(Crossover.crossover(params)).rejects.toThrow(
        "Request timeout"
      )
    })
  })

  describe("Performance", () => {
    it("should complete crossover operation within reasonable time", async () => {
      // Verbose mode will be set by runtime constants mock

      const { Crossover } = await import(
        "@/core/improvement/gp/operators/crossover/Crossover"
      )
      const { createDummyGenome } = await import(
        "@/core/improvement/gp/resources/debug/dummyGenome"
      )

      const startTime = Date.now()
      const params = createMockCrossoverParams({
        parents: [
          createDummyGenome([], evolutionContext),
          createDummyGenome([], evolutionContext),
        ],
      })
      const response = await Crossover.crossover(params)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000)
      if (!response.success || !response.data) {
        throw new Error("Crossover failed")
      }

      expect(response.data.genome.parentWorkflowVersionIds.length).toBe(2)
    })
  })
})
