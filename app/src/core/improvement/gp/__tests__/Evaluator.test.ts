// tests for Evaluator - fitness evaluation for genetic programming
import { codeToolAutoDiscovery } from "@/core/tools/code/AutoDiscovery"
import {
  createMockGenome,
  createMockWorkflowConfig,
  createMockWorkflowIO,
  createMockWorkflowScore,
  mockRuntimeConstantsForGP,
  setupCoreTest,
} from "@/core/utils/__tests__/setup/coreMocks"
import { Workflow } from "@/core/workflow/Workflow"
import type { WorkflowConfig } from "@/core/workflow/schema/workflow.types"
import { MODELS } from "@/runtime/settings/constants.client"
import { beforeEach, describe, expect, it, vi } from "vitest"

// mock external dependencies
const mockWorkflowCreate = vi.fn()
vi.mock("@/core/workflow/Workflow", () => ({
  Workflow: {
    create: mockWorkflowCreate,
  },
}))

const mockAggregatedEvaluatorEvaluate = vi.fn()
vi.mock("@/core/improvement/evaluators/AggregatedEvaluator", () => ({
  AggregatedEvaluator: vi.fn().mockImplementation(() => ({
    evaluate: mockAggregatedEvaluatorEvaluate,
  })),
}))

const mockCalculateFitness = vi.fn()
vi.mock(
  "@/core/workflow/actions/analyze/calculate-fitness/calculateFitness",
  () => ({
    calculateFitness: mockCalculateFitness,
  })
)

const mockSaveGenomeToDatabase = vi.fn()
vi.mock("@/core/improvement/gp/resources/saveGenomeToDatabase", () => ({
  saveGenomeToDatabase: mockSaveGenomeToDatabase,
}))

const mockLggError = vi.fn()
vi.mock("@/core/utils/logging/Logger", () => ({
  lgg: {
    log: vi.fn(),
    error: mockLggError,
  },
}))

// Mock runtime constants to avoid dependency issues
// Runtime constants mocked by mockRuntimeConstantsForGP

describe("Engine Critical", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(codeToolAutoDiscovery, "discoverTools").mockResolvedValue([])

    vi.spyOn(Workflow, "ideaToWorkflow").mockResolvedValue({
      success: true,
      data: {
        entryNodeId: "node1",
        nodes: [
          {
            nodeId: "node1",
            modelName: MODELS.default,
            systemPrompt: "Mock system prompt",
            description: "Mock description",
            mcpTools: [],
            codeTools: [],
            handOffs: [],
          },
        ] as WorkflowConfig["nodes"],
      } as WorkflowConfig,
      usdCost: 0.01,
    })
  })
})

describe("Evaluator", () => {
  beforeEach(() => {
    setupCoreTest()
    mockRuntimeConstantsForGP()

    // setup default successful workflow execution
    const mockWorkflow = {
      run: vi.fn().mockResolvedValue({
        result: "test workflow output",
        cost: 0.05,
        executionTime: 1500,
      }),
      getWorkflowVersionId: vi.fn().mockReturnValue("test-version-id"),
      setWorkflowIO: vi.fn().mockResolvedValue(undefined),
    }
    mockWorkflowCreate.mockReturnValue(mockWorkflow)

    // setup default aggregated evaluator behavior
    mockAggregatedEvaluatorEvaluate.mockResolvedValue({
      fitness: {
        score: 0.8,
        totalCostUsd: 0.05,
        totalTimeSeconds: 1.5,
        accuracy: 0.85,
        novelty: 0.85,
      },
      transcript: "test transcript",
      cost: 0.05,
      summaries: [],
    })

    // setup default fitness calculation
    mockCalculateFitness.mockReturnValue({
      score: 0.8,
      accuracy: 0.85,
      novelty: 0.85,
      cost: 0.05,
      time: 1.5,
      valid: true,
    })

    mockSaveGenomeToDatabase.mockResolvedValue({
      workflowVersionId: "test-version-id",
      workflowInvocationId: "test-invocation-id",
    })
  })

  describe("GPEvaluatorAdapter", () => {
    it("should evaluate genome successfully", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result).toEqual({
        valid: true,
        score: 0.8,
        totalCostUsd: 0.05,
        totalTimeSeconds: expect.any(Number),
        accuracy: 0,
        novelty: 0,
        noveltyScore: 0,
        workflowVersionId: mockGenome.getWorkflowVersionId(),
        evaluatedAt: expect.any(String),
      })
    })

    it("should create workflow with genome config", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()
      const expectedConfig = createMockWorkflowConfig()

      // mock genome to return specific config
      mockGenome.getWorkflowConfig.mockReturnValue(expectedConfig)

      await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(mockWorkflowCreate).toHaveBeenCalledWith({
        config: expectedConfig,
        evaluationInput: mockGenome.getEvaluationInput(),
        parentVersionId: undefined,
        _evolutionContext: undefined,
      })
    })

    it("should run workflow and collect metrics", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(mockAggregatedEvaluatorEvaluate).toHaveBeenCalledWith(
        expect.any(Object), // the workflow instance
        [createMockWorkflowIO()]
      )
    })

    it("should handle workflow creation failure", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      mockWorkflowCreate.mockImplementation(() => {
        throw new Error("workflow creation failed")
      })

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("workflow creation failed")
      expect(mockLggError).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Error)
      )
    })

    it("should handle workflow execution failure", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      mockAggregatedEvaluatorEvaluate.mockRejectedValue(
        new Error("workflow execution failed")
      )

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("workflow execution failed")
      expect(mockLggError).toHaveBeenCalled()
    })

    it("should handle fitness calculation failure", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      mockAggregatedEvaluatorEvaluate.mockRejectedValue(
        new Error("fitness calculation failed")
      )

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("fitness calculation failed")
    })

    it("should handle invalid fitness scores", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      mockAggregatedEvaluatorEvaluate.mockResolvedValue({
        fitness: {
          score: NaN,
          totalCostUsd: 0.05,
          totalTimeSeconds: 1.5,
          accuracy: -1,
          novelty: -1,
        },
        transcript: "test transcript",
        cost: 0.05,
        summaries: [],
      })

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      // GPEvaluatorAdapter doesn't validate NaN scores, it just returns them
      expect(result.success).toBe(true)
      expect(result.data?.fitness?.score).toBeNaN()
      expect(result.data?.fitness?.accuracy).toBe(0)
    })

    it("should track costs correctly", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      mockAggregatedEvaluatorEvaluate.mockResolvedValue({
        fitness: {
          score: 0.9,
          totalCostUsd: 0.15,
          totalTimeSeconds: 2.0,
          accuracy: 0.95,
          novelty: 0.95,
        },
        transcript: "test transcript",
        cost: 0.15,
        summaries: [],
      })

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.data?.fitness?.totalCostUsd).toBe(0.15)
      expect(result.data?.fitness?.totalTimeSeconds).toBeLessThan(1) // actual evaluation time, not the mocked value
    })
  })

  describe("evaluation metrics", () => {
    it("should generate valid timestamps", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      const timestamp = new Date(result.data?.evaluatedAt || "")
      expect(timestamp.getTime()).not.toBeNaN()
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now())
    })

    it("should handle zero cost evaluations", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      mockAggregatedEvaluatorEvaluate.mockResolvedValue({
        fitness: {
          score: 0.7,
          totalCostUsd: 0,
          totalTimeSeconds: 0.5,
          accuracy: 0.75,
          novelty: 0.75,
        },
        transcript: "test transcript",
        cost: 0,
        summaries: [],
      })

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(true)
      expect(result.data?.fitness?.totalCostUsd).toBe(0)
    })

    it("should handle high fitness scores", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      mockAggregatedEvaluatorEvaluate.mockResolvedValue({
        fitness: {
          score: 0.99,
          totalCostUsd: 0.02,
          totalTimeSeconds: 0.8,
          accuracy: 0.98,
          novelty: 0.98,
        },
        transcript: "test transcript",
        cost: 0.02,
        summaries: [],
      })

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(true)
      expect(result.data?.fitness?.score).toBe(0.99)
      expect(result.data?.fitness?.accuracy).toBe(0) // GPEvaluatorAdapter returns 0 for accuracy
    })

    it("should handle long execution times", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      mockAggregatedEvaluatorEvaluate.mockResolvedValue({
        fitness: {
          score: 0.6,
          totalCostUsd: 0.1,
          totalTimeSeconds: 30.0,
          accuracy: 0.65,
          novelty: 0.65,
        },
        transcript: "test transcript",
        cost: 0.1,
        summaries: [],
      })

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(true)
      expect(result.data?.fitness?.totalTimeSeconds).toBeLessThan(1) // actual evaluation time, not the mocked value
    })
  })

  describe("error recovery", () => {
    it("should return consistent invalid result format", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      mockWorkflowCreate.mockImplementation(() => {
        throw new Error("failure")
      })

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result).toEqual({
        success: false,
        error: "catastrophic failure",
        data: undefined,
        usdCost: 0,
      })
    })

    it("should not throw exceptions on evaluation failure", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      mockWorkflowCreate.mockImplementation(() => {
        throw new Error("catastrophic failure")
      })

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      await expect(
        evaluator.evaluate(mockGenome, {
          runId: "test-run-id",
          generationId: "test-generation-id",
          generationNumber: 1,
        })
      ).resolves.not.toThrow()
    })

    it("should log detailed error information", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      const specificError = new Error("specific evaluation error")
      mockAggregatedEvaluatorEvaluate.mockRejectedValue(specificError)

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(mockLggError).toHaveBeenCalledWith(
        expect.any(String),
        specificError
      )
    })
  })

  describe("multi-objective evaluation", () => {
    it("should support multiple fitness criteria", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      mockAggregatedEvaluatorEvaluate.mockResolvedValue({
        fitness: {
          score: 0.85,
          totalCostUsd: 0.03,
          totalTimeSeconds: 1.2,
          accuracy: 0.9,
          novelty: 0.9,
        },
        transcript: "test transcript",
        cost: 0.03,
        summaries: [],
      })

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(true)
      expect(result.data?.fitness?.score).toBe(0.85)
      expect(result.data?.fitness?.accuracy).toBe(0) // GPEvaluatorAdapter returns 0 for accuracy
      // additional criteria might be included in future versions
    })
  })

  describe("performance optimization", () => {
    it("should handle concurrent evaluations", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const genomes = await Promise.all([
        createMockGenome(0, [], createMockWorkflowScore(0.8)),
        createMockGenome(0, [], createMockWorkflowScore(0.7)),
        createMockGenome(0, [], createMockWorkflowScore(0.9)),
      ])

      const evaluationPromises = genomes.map((genome) =>
        evaluator.evaluate(genome, {
          runId: "test-run-id",
          generationId: "test-generation-id",
          generationNumber: 1,
        })
      )
      const results = await Promise.all(evaluationPromises)

      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result.success).toBe(true)
        expect(result.data?.workflowVersionId).toBe(
          genomes[index].getWorkflowVersionId()
        )
      })
    })

    it("should maintain evaluation state independence", async () => {
      const { GPEvaluatorAdapter } = await import(
        "@/core/improvement/evaluators/GPEvaluatorAdapter"
      )

      const evaluator = new GPEvaluatorAdapter(
        [createMockWorkflowIO()],
        "test goal",
        "test analysis"
      )
      const genome1 = await createMockGenome()
      const genome2 = await createMockGenome()

      // set up different results for each evaluation
      mockAggregatedEvaluatorEvaluate
        .mockResolvedValueOnce({
          fitness: {
            score: 0.6,
            totalCostUsd: 0.1,
            totalTimeSeconds: 2.0,
            accuracy: 0.6,
            novelty: 0.6,
          },
          transcript: "test transcript 1",
          cost: 0.1,
          summaries: [],
        })
        .mockResolvedValueOnce({
          fitness: {
            score: 0.9,
            totalCostUsd: 0.02,
            totalTimeSeconds: 0.8,
            accuracy: 0.95,
            novelty: 0.95,
          },
          transcript: "test transcript 2",
          cost: 0.02,
          summaries: [],
        })

      const result1 = await evaluator.evaluate(genome1, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })
      const result2 = await evaluator.evaluate(genome2, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.data?.workflowVersionId).toBe(
        genome1.getWorkflowVersionId()
      )
      expect(result2.data?.workflowVersionId).toBe(
        genome2.getWorkflowVersionId()
      )
    })
  })
})
