// Clean, simple Evaluator tests - testing real behavior, not complex mocks
import { createMockGenome, createMockWorkflowIO, setupCoreTest } from "@core/utils/__tests__/setup/coreMocks"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Simple inline mocks - no external variables
vi.mock("@core/evaluation/evaluators/AggregatedEvaluator", () => ({
  AggregatedEvaluator: class {
    evaluate = vi.fn().mockResolvedValue({
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
    })

    protected aggregateFitness = vi.fn().mockReturnValue({
      score: 0.8,
      totalCostUsd: 0.05,
      totalTimeSeconds: 1.5,
      accuracy: 0.85,
    })
  },
}))

vi.mock("@core/improvement/gp/resources/debug/MockGPEvaluator", () => ({
  MockGPEvaluator: vi.fn().mockImplementation(() => ({
    evaluate: vi.fn().mockResolvedValue({
      success: true,
      data: { fitness: { score: 0.9 }, workflowVersionId: "mock-version" },
      usdCost: 0,
    }),
  })),
}))

vi.mock("@core/improvement/gp/resources/tracker", () => ({
  failureTracker: {
    trackEvaluationAttempt: vi.fn(),
    trackEvaluationFailure: vi.fn(),
  },
}))

vi.mock("@core/utils/logging/Logger", () => ({
  lgg: { log: vi.fn(), error: vi.fn() },
}))

describe("GPEvaluatorAdapter", () => {
  beforeEach(() => {
    setupCoreTest()
    vi.clearAllMocks()
  })

  it("evaluates genome successfully", async () => {
    const { GPEvaluatorAdapter: GPEvaluatorAdapterFail } = await import(
      "@core/evaluation/evaluators/GPEvaluatorAdapter"
    )
    const evaluator = new GPEvaluatorAdapterFail([createMockWorkflowIO()], "test goal", "test analysis")
    const genome = await createMockGenome()

    const result = await evaluator.evaluate(genome, {
      runId: "test-run",
      generationId: "test-gen",
      generationNumber: 1,
    })

    expect(result.success).toBe(true)
    expect(result.data?.fitness?.score).toBe(0.8)
    expect(result.usdCost).toBe(0.05)
  })

  it("handles evaluation failure", async () => {
    // Reset module registry to ensure per-test mock overrides take effect
    vi.resetModules()

    // Override mock implementation at runtime for this test only
    vi.doMock("@core/evaluation/evaluators/AggregatedEvaluator", () => ({
      AggregatedEvaluator: class {
        evaluate = vi.fn().mockRejectedValue(new Error("eval failed"))
        protected aggregateFitness = vi.fn()
      },
    }))

    const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")

    const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
    const genome = await createMockGenome()

    const result = await evaluator.evaluate(genome, {
      runId: "test-run",
      generationId: "test-gen",
      generationNumber: 1,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("Evaluation failed")
  })

  it("uses prompt-only path when configured", async () => {
    const { GPEvaluatorAdapter: GPEvaluatorAdapterCalls } = await import(
      "@core/evaluation/evaluators/GPEvaluatorAdapter"
    )
    const evaluator = new GPEvaluatorAdapterCalls([createMockWorkflowIO()], "test goal", "test analysis")
    const genome = await createMockGenome()

    genome.getEvaluationInput.mockReturnValue({ type: "prompt-only" })

    const result = await evaluator.evaluate(genome, {
      runId: "test-run",
      generationId: "test-gen",
      generationNumber: 1,
    })

    expect(result.success).toBe(true)
    expect(result.data?.fitness?.score).toBe(1.0)
    expect(result.data?.feedback).toBe("Prompt-only workflow - evaluation skipped")
  })

  it("calls genome methods correctly", async () => {
    const { GPEvaluatorAdapter } = await import("@core/evaluation/evaluators/GPEvaluatorAdapter")
    const evaluator = new GPEvaluatorAdapter([createMockWorkflowIO()], "test goal", "test analysis")
    const genome = await createMockGenome()

    await evaluator.evaluate(genome, {
      runId: "test-run",
      generationId: "test-gen",
      generationNumber: 1,
    })

    expect(genome.getEvaluationInput).toHaveBeenCalled()
    expect(genome.setPrecomputedWorkflowData).toHaveBeenCalledWith({
      workflowIO: [expect.any(Object)],
      newGoal: "test goal",
      problemAnalysis: "test analysis",
    })
  })
})
