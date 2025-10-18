// tests for Evaluator - fitness evaluation for genetic programming
import {
  createMockGenome,
  createMockWorkflowIO,
  createMockWorkflowScore,
  setupCoreTest,
} from "@core/utils/__tests__/setup/coreMocks"
import { beforeEach, describe, expect, it, vi } from "vitest"

// TODO: This test file primarily tests mock behavior rather than actual evaluation logic
// - Tests verify that mocked AggregatedEvaluator returns expected values
// - No tests for the actual fitness calculation algorithms
// - No tests for how fitness scores are computed from workflow performance

vi.mock("@core/evaluation/evaluators/AggregatedEvaluator", () => ({
  AggregatedEvaluator: vi.fn().mockImplementation(() => ({
    evaluate: vi.fn().mockResolvedValue({
      success: true,
      data: {
        fitness: {
          score: 0.8,
          totalCostUsd: 0.05,
          totalTimeSeconds: 1.5,
          accuracy: 0.85,
        },
        feedback: "test feedback",
      },
      usdCost: 0.05,
    }),
  })),
}))

vi.mock("@core/improvement/gp/rsc/tracker", () => ({
  failureTracker: {
    trackEvaluationAttempt: vi.fn(),
    trackEvaluationFailure: vi.fn(),
  },
}))

vi.mock("@core/utils/logging/Logger", () => ({
  lgg: {
    log: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@core/workflow/Workflow", () => ({
  Workflow: {
    create: vi.fn(),
  },
}))

describe("Evaluator", () => {
  beforeEach(() => {
    setupCoreTest()
    vi.clearAllMocks()
  })

  describe("GPEvaluatorAdapter", () => {
    // TODO: This test only verifies that the mock returns expected values
    // - Doesn't test actual evaluation logic or fitness calculation
    // - Should test with real workflow execution results
    it("should evaluate genome successfully", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(true)
      expect(result.data?.fitness?.score).toBe(0.8)
      expect(result.usdCost).toBe(0.05)
    })

    it("should set precomputed workflow data on genome", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(mockGenome.setPrecomputedWorkflowData).toHaveBeenCalledWith({
        workflowIO: [createMockWorkflowIO()],
        newGoal: "test goal",
        problemAnalysis: "test analysis",
      })
    })

    // TODO: This test only verifies mock interaction, not evaluation behavior
    // - Should test that genome's workflow is actually executed
    // - Should verify fitness is calculated based on workflow performance
    it("should call aggregated evaluator with genome", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      const mockEvaluatorInstance = vi.mocked(AggregatedEvaluator).mock.results[0].value
      expect(mockEvaluatorInstance.evaluate).toHaveBeenCalledWith(mockGenome)
    })

    it("should handle aggregated evaluator returning failure", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")

      // Override mock for this test only
      const mockEvaluate = vi.fn().mockResolvedValue({
        success: false,
        error: "evaluation failed",
        usdCost: 0.02,
      })
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Aggregated evaluation failed: evaluation failed")
      expect(result.usdCost).toBe(0.02)
    })

    it("should handle aggregated evaluator throwing exception", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")
      const { lgg } = await import("@core/utils/logging/Logger")

      // Override mock for this test only
      const mockEvaluate = vi.fn().mockRejectedValue(new Error("evaluation threw error"))
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Evaluation failed")
      expect(result.usdCost).toBe(0.001)
      expect(vi.mocked(lgg.error)).toHaveBeenCalled()
    })

    it("should handle missing fitness data", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")

      // Override mock for this test only
      const mockEvaluate = vi.fn().mockResolvedValue({
        success: true,
        data: {
          // missing fitness property
          feedback: "test feedback",
        },
        usdCost: 0.05,
      })
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Evaluation failed")
    })

    // TODO: Poor test - it accepts invalid fitness scores without validation
    // - Should test that evaluator rejects NaN/negative fitness scores
    // - Should ensure fitness scores are normalized to [0, 1] range
    // - Missing validation for fitness score bounds
    it("should handle invalid fitness scores", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")

      // Override mock for this test only
      const mockEvaluate = vi.fn().mockResolvedValue({
        success: true,
        data: {
          fitness: {
            score: Number.NaN,
            totalCostUsd: 0.05,
            totalTimeSeconds: 1.5,
            accuracy: -1,
          },
          feedback: "test feedback",
        },
        usdCost: 0.05,
      })
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      // GPEvaluatorAdapter doesn't validate NaN scores, it just returns them
      expect(result.success).toBe(true)
      expect(result.data?.fitness?.score).toBeNaN()
      expect(result.data?.fitness?.accuracy).toBe(-1)
    })

    it("should track costs correctly", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")

      // Override mock for this test only
      const mockEvaluate = vi.fn().mockResolvedValue({
        success: true,
        data: {
          fitness: {
            score: 0.9,
            totalCostUsd: 0.15,
            totalTimeSeconds: 2.0,
            accuracy: 0.95,
          },
          feedback: "test feedback",
        },
        usdCost: 0.15,
      })
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.data?.fitness?.totalCostUsd).toBe(0.15)
      expect(result.usdCost).toBe(0.15)
    })
  })

  describe("evaluation metrics", () => {
    // TODO: Superficial test - only checks timestamp format, not evaluation metrics
    // - Should test actual fitness metric calculations
    // - Should test how accuracy and other metrics are computed
    // - Missing tests for metric aggregation and weighting
    it("should generate valid timestamps", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
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
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")

      // Override mock for this test only
      const mockEvaluate = vi.fn().mockResolvedValue({
        success: true,
        data: {
          fitness: {
            score: 0.7,
            totalCostUsd: 0,
            totalTimeSeconds: 0.5,
            accuracy: 0.75,
          },
          feedback: "test feedback",
        },
        usdCost: 0,
      })
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(true)
      expect(result.data?.fitness?.totalCostUsd).toBe(0)
      expect(result.usdCost).toBe(0)
    })

    it("should handle high fitness scores", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")

      // Override mock for this test only
      const mockEvaluate = vi.fn().mockResolvedValue({
        success: true,
        data: {
          fitness: {
            score: 0.99,
            totalCostUsd: 0.02,
            totalTimeSeconds: 0.8,
            accuracy: 0.98,
          },
          feedback: "test feedback",
        },
        usdCost: 0.02,
      })
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(true)
      expect(result.data?.fitness?.score).toBe(0.99)
      expect(result.data?.fitness?.accuracy).toBe(0.98)
    })

    it("should handle long execution times", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")

      // Override mock for this test only
      const mockEvaluate = vi.fn().mockResolvedValue({
        success: true,
        data: {
          fitness: {
            score: 0.6,
            totalCostUsd: 0.1,
            totalTimeSeconds: 30.0,
            accuracy: 0.65,
          },
          feedback: "test feedback",
        },
        usdCost: 0.1,
      })
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(true)
      expect(result.data?.fitness?.totalTimeSeconds).toBe(30.0) // returns the actual fitness data from aggregated evaluator
    })
  })

  describe("error recovery", () => {
    it("should return consistent invalid result format", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")

      // Override mock to throw an error
      const mockEvaluate = vi.fn().mockRejectedValue(new Error("catastrophic failure"))
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result).toEqual({
        success: false,
        error: "Evaluation failed",
        data: undefined,
        usdCost: 0.001,
      })
    })

    it("should not throw exceptions on evaluation failure", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")

      // Override mock to throw an error
      const mockEvaluate = vi.fn().mockRejectedValue(new Error("catastrophic failure"))
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      await expect(
        evaluator.evaluate(mockGenome, {
          runId: "test-run-id",
          generationId: "test-generation-id",
          generationNumber: 1,
        }),
      ).resolves.not.toThrow()
    })

    it("should log detailed error information", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")
      const { lgg } = await import("@core/utils/logging/Logger")

      const specificError = new Error("specific evaluation error")
      // Override mock to throw specific error
      const mockEvaluate = vi.fn().mockRejectedValue(specificError)
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(vi.mocked(lgg.error)).toHaveBeenCalledWith(expect.any(String), specificError)
    })
  })

  // TODO: Missing critical multi-objective optimization tests
  // - No tests for Pareto dominance between solutions
  // - No tests for trade-offs between objectives (cost vs accuracy)
  // - No tests for fitness normalization across different scales
  describe("multi-objective evaluation", () => {
    // TODO: Only tests that mock returns multiple values, not actual multi-objective logic
    it("should support multiple fitness criteria", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")

      // Override mock for this test only
      const mockEvaluate = vi.fn().mockResolvedValue({
        success: true,
        data: {
          fitness: {
            score: 0.85,
            totalCostUsd: 0.03,
            totalTimeSeconds: 1.2,
            accuracy: 0.9,
          },
          feedback: "test feedback",
        },
        usdCost: 0.03,
      })
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const mockGenome = await createMockGenome()

      const result = await evaluator.evaluate(mockGenome, {
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 1,
      })

      expect(result.success).toBe(true)
      expect(result.data?.fitness?.score).toBe(0.85)
      expect(result.data?.fitness?.accuracy).toBe(0.9)
    })
  })

  describe("performance optimization", () => {
    it("should handle concurrent evaluations", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const genomes = await Promise.all([
        createMockGenome(0, [], createMockWorkflowScore(0.8)),
        createMockGenome(0, [], createMockWorkflowScore(0.7)),
        createMockGenome(0, [], createMockWorkflowScore(0.9)),
      ])

      const evaluationPromises = genomes.map(genome =>
        evaluator.evaluate(genome, {
          runId: "test-run-id",
          generationId: "test-generation-id",
          generationNumber: 1,
        }),
      )
      const results = await Promise.all(evaluationPromises)

      expect(results).toHaveLength(3)
      results.forEach((result, index) => {
        expect(result.success).toBe(true)
        expect(result.data?.workflowVersionId).toBe(genomes[index].getWorkflowVersionId())
      })
    })

    it("should maintain evaluation state independence", async () => {
      const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
      const { AggregatedEvaluator } = await import("@core/evaluation/evaluators/AggregatedEvaluator")

      const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
      const genome1 = await createMockGenome()
      const genome2 = await createMockGenome()

      // Override mock to return different results for each evaluation
      const mockEvaluate = vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          data: {
            fitness: {
              score: 0.6,
              totalCostUsd: 0.1,
              totalTimeSeconds: 2.0,
              accuracy: 0.6,
            },
            feedback: "test feedback 1",
          },
          usdCost: 0.1,
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            fitness: {
              score: 0.9,
              totalCostUsd: 0.02,
              totalTimeSeconds: 0.8,
              accuracy: 0.95,
            },
            feedback: "test feedback 2",
          },
          usdCost: 0.02,
        })
      vi.mocked(AggregatedEvaluator).mockImplementation(
        () =>
          ({
            evaluate: mockEvaluate,
          }) as any,
      )

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
      expect(result1.data?.workflowVersionId).toBe(genome1.getWorkflowVersionId())
      expect(result2.data?.workflowVersionId).toBe(genome2.getWorkflowVersionId())
    })
  })
})
