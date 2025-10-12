import { getDefaultModels } from "@core/core-config/coreConfig"
// comprehensive tests for genome class
import {
  createMockEvaluationInputGeneric,
  createMockWorkflowConfig,
  createMockWorkflowGenome,
  createMockWorkflowScore,
} from "@core/utils/__tests__/setup/genomeTestUtils"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock runtime constants at top level
vi.mock("@examples/settings/constants", () => ({
  CONFIG: {
    coordinationType: "sequential",
    newNodeProbability: 0.7,
    evolution: {
      iterativeIterations: 3,
      GP: {
        verbose: false,
        populationSize: 5,
        generations: 3,
        initialPopulationMethod: "random",
        initialPopulationFile: null,
        maximumTimeMinutes: 10,
      },
    },
    tools: {
      inactive: new Set(),
      defaultTools: new Set(),
      uniqueToolsPerAgent: false,
      uniqueToolSetsPerAgent: false,
      maxToolsPerAgent: 6,
      maxStepsVercel: 1,
      autoSelectTools: false,
      usePrepareStepStrategy: false,
      experimentalMultiStepLoop: false,
      showParameterSchemas: false,
    },
    models: {
      inactive: new Set(),
      provider: "openai",
    },
    workflow: {
      maxTotalNodeInvocations: 14,
      maxPerNodeInvocations: 14,
      maxNodes: 100,
      handoffContent: "summary",
      prepareProblem: true,
      prepareProblemMethod: "ai",
      prepareProblemWorkflowVersionId: "test-version-id",
    },
    verification: {
      allowCycles: false,
      enableOutputValidation: false,
      maxFilesPerWorkflow: 1,
      enforceFileLimit: true,
    },
    improvement: {
      flags: {
        maxRetriesForWorkflowRepair: 3,
        selfImproveNodes: false,
        addTools: false,
        analyzeWorkflow: false,
        removeNodes: false,
        editNodes: false,
        useSummariesForImprovement: false,
        improvementType: "judge",
        operatorsWithFeedback: false,
      },
      fitness: {
        timeThresholdSeconds: 70,
        baselineTimeSeconds: 5,
        baselineCostUsd: 0.1,
        costThresholdUsd: 1.0,
        weights: {
          score: 0.6,
          time: 0.2,
          cost: 0.2,
        },
      },
    },
    context: {
      maxFilesPerWorkflow: 10,
      enforceFileLimit: false,
    },
    limits: {
      maxCostUsdPerRun: 100,
      enableSpendingLimits: false,
      rateWindowMs: 1000,
      maxRequestsPerWindow: 100,
      maxConcurrentWorkflows: 10,
      maxConcurrentAIRequests: 5,
      enableStallGuard: false,
      enableParallelLimit: false,
    },
    logging: {
      level: "info",
      override: {
        Database: true,
        GP: true,
        API: false,
      },
    },
  },
  MODELS: {
    default: "openai/gpt-4.1-mini",
    nano: "openai/gpt-4.1-mini",
    medium: "openai/gpt-4.1-mini",
    high: "openai/gpt-4.1-mini",
    fitness: "openai/gpt-4.1-mini",
    reasoning: "openai/gpt-4.1-mini",
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

// Mock workflowConfigToGenome wrapper - specific to this test
vi.mock("@core/improvement/gp/resources/wrappers", () => ({
  workflowConfigToGenome: vi.fn(),
}))

// Mock createDummyGenome
vi.mock("@core/improvement/gp/resources/debug/dummyGenome", () => ({
  createDummyGenome: vi.fn(),
}))

// Mock database operations
vi.mock("@core/utils/persistence/workflow/registerWorkflow", () => ({
  registerWorkflowInDatabase: vi.fn().mockResolvedValue({
    workflowVersionId: "test-version-id",
    workflowInvocationId: "test-invocation-id",
  }),
  ensureWorkflowExists: vi.fn().mockResolvedValue(undefined),
  createWorkflowVersion: vi.fn().mockResolvedValue(undefined),
  createWorkflowInvocation: vi.fn().mockResolvedValue(undefined),
}))

// Mock ideaToWorkflow
vi.mock("@core/workflow/actions/generate/ideaToWorkflow", () => ({
  ideaToWorkflow: vi.fn().mockResolvedValue({
    success: true,
    data: { nodes: [], entryNodeId: "test-node" },
    usdCost: 0.01,
  }),
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

// Don't mock Workflow class - let Genome inherit properly

// Import after mocks to avoid hoisting issues
import { Genome } from "@core/improvement/gp/Genome"
import { createDummyGenome } from "@core/improvement/gp/resources/debug/dummyGenome"
import type { WorkflowGenome } from "@core/improvement/gp/resources/gp.types"
import type { EvolutionContext } from "@core/improvement/gp/resources/types"
import { workflowConfigToGenome } from "@core/improvement/gp/resources/wrappers"
import { createWorkflowVersion } from "@core/utils/persistence/workflow/registerWorkflow"

import type { EvaluationCSV, EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import type { RS } from "@lucky/shared"
// Get references to mocked functions
const mockIdeaToWorkflow = vi.fn()
const mockWorkflowConfigToGenome = vi.mocked(workflowConfigToGenome)
const mockCreateDummyGenome = vi.mocked(createDummyGenome)

const evolutionContext = {
  runId: "test-run-id",
  generationId: "test-gen-id",
  generationNumber: 0,
}

describe("Genome", () => {
  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()

    // Setup mockIdeaToWorkflow with default implementation
    mockIdeaToWorkflow.mockImplementation(async () => ({
      success: true,
      data: { nodes: [], entryNodeId: "test-node" },
      usdCost: 0.01,
    }))

    // Setup mock implementations after reset
    mockWorkflowConfigToGenome.mockImplementation(
      async ({
        workflowConfig,
        parentWorkflowVersionIds,
        evaluationInput,
        _evolutionContext,
      }: {
        workflowConfig: WorkflowConfig
        parentWorkflowVersionIds: string[]
        evaluationInput: EvaluationInput
        _evolutionContext: EvolutionContext
      }): Promise<RS<Genome>> => {
        const genomeData: WorkflowGenome = {
          nodes: workflowConfig.nodes,
          entryNodeId: workflowConfig.entryNodeId,
          parentWorkflowVersionIds,
          createdAt: new Date().toISOString(),
          _evolutionContext: evolutionContext,
        }
        return {
          success: true,
          usdCost: 0,
          data: new Genome(genomeData, evaluationInput, evolutionContext),
        }
      },
    )

    mockCreateDummyGenome.mockImplementation(
      (parentWorkflowVersionIds: string[] | undefined, _evolutionContext: EvolutionContext) => {
        const evaluationInput = createMockEvaluationInputGeneric()
        const genomeData = {
          parentWorkflowVersionIds: parentWorkflowVersionIds || [],
          createdAt: new Date().toISOString(),
          entryNodeId: "dummy-node",
          nodes: [
            {
              nodeId: "dummy-node",
              description: "dummy node",
              systemPrompt: "dummy system prompt",
              modelName: getDefaultModels().default,
              mcpTools: [],
              codeTools: [],
              handOffs: [],
              memory: {},
            },
          ],
          _evolutionContext: {
            ..._evolutionContext,
            generationNumber: 0,
          },
        }
        return new Genome(genomeData, evaluationInput, evolutionContext)
      },
    )
  })

  describe("Constructor", () => {
    it("should create genome from workflow genome data", () => {
      const genomeData = createMockWorkflowGenome()
      const evaluationInput = createMockEvaluationInputGeneric()

      const genome = new Genome(genomeData, evaluationInput, evolutionContext)

      expect(genome.genome).toEqual(genomeData)
      expect(genome.getEvaluationInput().goal).toBe(evaluationInput.goal)
      expect(genome.getFitnessAndFeedback()?.fitness?.score).toBe(0)
      expect(genome.getFitnessAndFeedback()?.hasBeenEvaluated).toBe(false)
    })

    it("should initialize with evolution context", () => {
      const genomeData = createMockWorkflowGenome()
      const evaluationInput = createMockEvaluationInputGeneric()
      const evolutionContext = {
        runId: "test-run-id",
        generationId: "test-gen-id",
        generationNumber: 0,
      }

      const genome = new Genome(genomeData, evaluationInput, evolutionContext)

      expect(genome.genome).toEqual(genomeData)
      expect(genome.getEvolutionContext()).toEqual(evolutionContext)
    })
  })

  describe("Static Methods", () => {
    describe("createRandom", () => {
      // TODO: multiple tests marked as .skip without explanation
      // indicates incomplete test suite - either complete or document why skipped
      it.skip("should create random genome in non-verbose mode", async () => {
        const evaluationInput = createMockEvaluationInputGeneric()

        const genome = await Genome.createRandom({
          evaluationInput,
          parentWorkflowVersionIds: [],
          _evolutionContext: evolutionContext,
          problemAnalysis: "dummy-problem-analysis",
          evolutionMode: "GP",
        })

        expect(genome.success).toBe(true)
        expect(genome.data?.genome?.parentWorkflowVersionIds.length).toBe(0)
        // TODO: comment "Workflow.ideaToWorkflow is called directly, not our mock"
        // suggests mocking issues - fix mocks or update test approach
        // Note: Workflow.ideaToWorkflow is called directly, not our mock
        // Just verify the result is correct
        expect(genome.success).toBe(true)
      })

      it.skip("should create genome using idea to workflow", async () => {
        const evaluationInput = createMockEvaluationInputGeneric()

        const genome = await Genome.createRandom({
          evaluationInput,
          parentWorkflowVersionIds: ["parent1"],
          _evolutionContext: evolutionContext,
          problemAnalysis: "dummy-problem-analysis",
          evolutionMode: "GP",
        })

        expect(genome.success).toBe(true)
        expect(genome.data?.genome?.parentWorkflowVersionIds.length).toBe(1)
        expect(mockWorkflowConfigToGenome).toHaveBeenCalled()
      })

      it.skip("should handle workflow generation failure", async () => {
        mockIdeaToWorkflow.mockImplementation(async () => ({
          success: false,
          error: "test error",
          usdCost: 0,
        }))
        const evaluationInput = createMockEvaluationInputGeneric()

        const result = await Genome.createRandom({
          evaluationInput,
          parentWorkflowVersionIds: [],
          _evolutionContext: evolutionContext,
          problemAnalysis: "dummy-problem-analysis",
          evolutionMode: "GP",
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain("test error")
      })

      it.skip("should add generation cost to genome", async () => {
        const mockCost = 0.05
        mockIdeaToWorkflow.mockImplementation(async () => ({
          success: true,
          data: createMockWorkflowConfig(),
          usdCost: mockCost,
        }))

        const evaluationInput = createMockEvaluationInputGeneric()
        const genome = await Genome.createRandom({
          evaluationInput,
          parentWorkflowVersionIds: [],
          _evolutionContext: evolutionContext,
          problemAnalysis: "dummy-problem-analysis",
          evolutionMode: "GP",
        })

        expect(genome.success).toBe(true)
        expect(genome.data).toBeInstanceOf(Genome)
      })
    })

    describe("toWorkflowConfig", () => {
      it("should convert genome to workflow config", () => {
        const genomeData = createMockWorkflowGenome()

        const config = Genome.toWorkflowConfig(genomeData)

        expect(config.nodes).toEqual(genomeData.nodes)
        expect(config.entryNodeId).toBe(genomeData.entryNodeId)
        expect(config).not.toHaveProperty("wfVersionId")
        expect(config).not.toHaveProperty("generation")
      })
    })
  })

  describe("Instance Methods", () => {
    let genome: Genome
    let genomeData: any

    beforeEach(() => {
      genomeData = createMockWorkflowGenome()
      const evaluationInput = createMockEvaluationInputGeneric()
      genome = new Genome(genomeData, evaluationInput, evolutionContext)
    })

    describe("Basic Getters", () => {
      it("should return workflow config", () => {
        const config = genome.getWorkflowConfig()

        expect(config.nodes).toEqual(genomeData.nodes)
        expect(config.entryNodeId).toBe(genomeData.entryNodeId)
      })

      it("should return goal evaluation", () => {
        const evaluationInput = genome.getEvaluationInput()

        expect(evaluationInput.goal).toBe("Calculate the sum")
        expect(evaluationInput.type).toBe("text")
      })

      it("should return raw genome", () => {
        const raw = genome.getRawGenome()

        expect(raw).toEqual(genomeData)
      })
    })

    describe("Fitness Management", () => {
      it("should set fitness correctly", () => {
        const score = createMockWorkflowScore()

        genome.setFitnessAndFeedback({ fitness: score, feedback: "" })

        const fitness = genome.getFitness()
        expect(fitness?.score).toBe(0.8)
        expect(genome.getFitnessAndFeedback()?.hasBeenEvaluated).toBe(true)
        expect(genome.getFitnessAndFeedback()?.evaluatedAt).toBeDefined()
      })

      it("should mark invalid fitness for zero score", () => {
        const score = { ...createMockWorkflowScore(), score: 0 }

        genome.setFitnessAndFeedback({ fitness: score, feedback: "" })

        expect(genome.getFitnessAndFeedback()?.fitness?.score).toBe(0)
        expect(genome.getFitnessAndFeedback()?.hasBeenEvaluated).toBe(true)
      })

      it("should preserve existing fitness when getting", () => {
        const genomeResults = genome.getFitnessAndFeedback()

        expect(genomeResults?.fitness?.score).toBe(0)
        expect(genomeResults?.hasBeenEvaluated).toBe(false)
      })
    })

    describe("Cost Management", () => {
      it("should add cost correctly", () => {
        genome.addCost(0.05)
        genome.addCost(0.03)

        // TODO: comment "cost is internal, verify through behavior" but no behavior is verified
        // should test the effect of addCost on evaluation results or total cost
        // cost is internal, verify through behavior
        expect(genome).toBeInstanceOf(Genome)
      })
    })

    describe("Database Operations", () => {
      it("should save to database with evolution metadata", async () => {
        await createWorkflowVersion({
          persistence: undefined,
          workflowVersionId: "test-version-id",
          workflowConfig: genome.getWorkflowConfig(),
          commitMessage: "test commit",
          generation: "test-gen-id",
          operation: "init",
          parent1Id: "parent1",
          parent2Id: "parent2",
          workflowId: genome.getWorkflowId(),
        })

        expect(vi.mocked(createWorkflowVersion)).toHaveBeenCalledWith({
          persistence: undefined,
          workflowVersionId: "test-version-id",
          workflowConfig: genome.getWorkflowConfig(),
          commitMessage: "test commit",
          generation: "test-gen-id",
          operation: "init",
          parent1Id: "parent1",
          parent2Id: "parent2",
          workflowId: genome.getWorkflowId(),
        })
      })
    })
  })

  describe("Integration", () => {
    it("should work with inheritance from Workflow class", () => {
      const genomeData = createMockWorkflowGenome()
      const evaluationInput = createMockEvaluationInputGeneric()
      const genome = new Genome(genomeData, evaluationInput, evolutionContext)

      // test inherited workflow methods
      expect(genome.getNodeIds()).toBeDefined()
      expect(genome.getConfig()).toBeDefined()
      expect(genome.getEvaluationInput().goal).toBeDefined()
    })

    it("should maintain genome-specific data while extending workflow", () => {
      const genomeData = createMockWorkflowGenome()
      const evaluationInput = createMockEvaluationInputGeneric()
      const genome = new Genome(genomeData, evaluationInput, evolutionContext)

      expect(genome.genome).toEqual(genomeData)
      expect(genome.getFitnessAndFeedback()).toBeDefined()

      // workflow properties
      expect(genome.getEvaluationInput().goal).toBeDefined()
      expect(genome.getEvaluationInput() as EvaluationCSV).toBeDefined()
    })
  })

  describe("Error Handling", () => {
    it("should handle malformed genome data gracefully", () => {
      const malformedData = {
        ...createMockWorkflowGenome(),
        nodes: [], // empty nodes array
      }

      expect(() => {
        const evaluationInput = createMockEvaluationInputGeneric()
        new Genome(malformedData, evaluationInput, evolutionContext)
      }).not.toThrow()
    })

    it("should handle missing properties in workflow score", () => {
      const incompleteScore = {
        score: 0.8,
        totalCostUsd: 0.01,
      } as any // TODO: using 'as any' to bypass TypeScript defeats purpose of type safety
      // create proper test data or use partial types instead

      expect(() => {
        const evaluationInput = createMockEvaluationInputGeneric()
        const genome = new Genome(createMockWorkflowGenome(), evaluationInput, evolutionContext)
        genome.setFitnessAndFeedback({
          fitness: incompleteScore,
          feedback: "",
        })
      }).not.toThrow()
    })
  })
})
