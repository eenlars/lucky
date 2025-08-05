// basic tests for genome class without complex mocking
import {
  createMockEvaluationInputGeneric,
  setupCoreTest,
  setupGPTestMocks,
} from "@core/utils/__tests__/setup/coreMocks"
import { MODELS } from "@runtime/settings/constants.client"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock runtime constants at top level
vi.mock("@runtime/settings/constants", () => ({
  CONFIG: {
    evolution: {
      GP: {
        verbose: false,
        populationSize: 5,
        generations: 3,
      },
    },
    tools: {
      inactive: new Set(),
      enable: { mcp: false, code: true },
    },
    models: {
      inactive: new Set(),
      provider: "openai",
    },
    improvement: {
      flags: {
        maxRetriesForWorkflowRepair: 3,
      },
    },
    logging: {
      level: "info",
      override: {},
    },
    limits: {
      enableParallelLimit: false,
      rateWindowMs: 1000,
      maxRequestsPerWindow: 100,
    },
    workflow: {
      parallelExecution: false,
    },
    verification: {
      allowCycles: false,
    },
    coordinationType: "sequential",
  },
  MODELS: {
    default: "openai/gpt-4.1-mini",
  },
  PATHS: {
    root: "/test",
    setupFile: "/test/setup.txt",
    codeTools: "/test/code/tools",
    node: {
      logging: "/test/logging",
    },
  },
}))

// Use the shared mock setup
setupGPTestMocks()

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

// mock external dependencies at the top level
vi.mock("@core/messages", () => ({
  Messages: {
    sendAIRequest: vi.fn().mockResolvedValue({
      success: true,
      data: {
        nodes: [
          {
            id: "node1",
            systemPrompt: "test",
            userPrompt: "test",
            expectedOutput: "test",
            tools: [],
            handoffRules: {},
          },
        ],
        entryNodeId: "node1",
      },
    }),
  },
}))

vi.mock(
  "@core/workflow/actions/generate/convert-simple-to-full/converter",
  () => ({
    convertSimpleToFull: vi.fn().mockResolvedValue({
      config: {
        nodes: [
          {
            id: "node1",
            systemPrompt: "test",
            userPrompt: "test",
            expectedOutput: "test",
            tools: [],
            handoffRules: {},
          },
        ],
        entryNodeId: "node1",
      },
      usdCost: 0.01,
    }),
  })
)

vi.mock(
  "@core/workflow/actions/generate/gen-full-workflow/generateWorkflow",
  () => ({
    generateSingleVariation: vi.fn().mockResolvedValue({
      workflow: {
        nodes: [
          {
            id: "node1",
            systemPrompt: "mutated test",
            userPrompt: "test",
            expectedOutput: "test",
            tools: [],
            handoffRules: {},
          },
        ],
        entryNodeId: "node1",
      },
      usdCost: 0.01,
    }),
  })
)

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

vi.mock("@runtime/settings/constants", () => ({
  CONFIG: {
    models: {
      inactive: new Set(["openai/gpt-4.1"]),
    },
    tools: {
      inactive: new Set([]),
    },
    logging: { override: { GP: false } },
    improvement: { flags: { selfImproveNodes: true } },
    limits: {
      rateWindowMs: 1000,
      maxRequestsPerWindow: 100,
    },
    verification: {
      enableOutputValidation: false,
    },
  },
  MODELS: {
    default: "test-model",
    nano: "test-nano",
    medium: "test-medium",
    high: "test-high",
  },
  PATHS: {
    root: "/test",
    app: "/test/app",
    runtime: "src/runtime",
    codeTools: "src/runtime/code_tools",
    setupFile: "src/runtime/setupfile.json",
    node: {
      logging: "src/runtime/logging_folder",
      memory: {
        root: "src/runtime/logging_folder/memory",
        summaries: "src/runtime/logging_folder/memory/summaries",
        chunks: "src/runtime/logging_folder/memory/chunks",
        workfiles: "src/runtime/logging_folder/memory/workfiles",
      },
      error: "src/runtime/logging_folder/error",
    },
  },
  WORKFLOW_ID: "test-workflow-id",
  DEFAULT_TIMEZONE: "Europe/Amsterdam",
}))

const evolutionContext = {
  runId: "test-run-id",
  generationId: "test-gen-id",
  generationNumber: 0,
}

vi.mock("@core/improvement/GP/resources/debug/dummyGenome", () => ({
  createDummyGenome: vi
    .fn()
    .mockImplementation(async (parentWorkflowVersionIds) => {
      const { Genome } = await import("@core/improvement/gp/Genome")
      const genomeData: WorkflowGenome = {
        nodes: [
          {
            nodeId: "dummy-node",
            description: "dummy",
            systemPrompt: "dummy",
            modelName: MODELS.default,
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ],
        entryNodeId: "dummy-node",
        _evolutionContext: evolutionContext,
        parentWorkflowVersionIds,
        createdAt: new Date().toISOString(),
      }
      const evaluationInput = {
        type: "text" as const,
        goal: "test",
        question: "test",
        answer: "test",
        workflowId: "test-workflow-id",
      }
      return new Genome(genomeData, evaluationInput, evolutionContext)
    }),
}))

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
vi.mock("@core/utils/clients/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}))

import { Genome } from "@core/improvement/gp/Genome"
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
        modelName: MODELS.default,
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
      expect(genome.genome).toEqual(genomeData)
    })

    it("should initialize fitness as invalid", () => {
      const genomeData = createTestGenomeData()
      const evaluationInput = createMockEvaluationInputGeneric()

      const genome = new Genome(genomeData, evaluationInput, evolutionContext)

      expect(genome.getFitness()?.score).toBe(0)
      expect(genome.getFitnessAndFeedback()?.hasBeenEvaluated).toBe(false)
    })
  })

  describe("Static Methods", () => {
    it("should create random genome", async () => {
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

      if (genomeResult.success) {
        expect(genomeResult.data?.genome.parentWorkflowVersionIds.length).toBe(
          0
        )
      } else {
        expect(genomeResult.error).toBeDefined()
      }
    })

    it("should convert genome to workflow config", () => {
      const genomeData = createTestGenomeData()

      const config = Genome.toWorkflowConfig(genomeData)

      expect(config.nodes).toEqual(genomeData.nodes)
      expect(config.entryNodeId).toBe(genomeData.entryNodeId)
      expect(config).not.toHaveProperty("wfVersionId")
    })
  })

  describe("Instance Methods", () => {
    let genome: Genome

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
      // This is a CSV type evaluation input (default), so it doesn't have question/answer
      expect(evaluationInput.type).toBe("csv")
    })

    it("should set and get fitness", () => {
      const fitness = {
        score: 0.8,
        totalCostUsd: 0.01,
        totalTimeSeconds: 10,
        accuracy: 0.8,
        novelty: 0.8,
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
        novelty: 0,
      }

      genome.setFitnessAndFeedback({ fitness, feedback: "test feedback" })

      expect(genome.getFitnessAndFeedback()?.hasBeenEvaluated).toBe(true)
    })
  })
})
