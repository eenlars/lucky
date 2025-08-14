import type { EvolutionContext } from "@core/improvement/gp/resources/types"
import {
  createMockGenome,
  mockRuntimeConstantsForGP,
  setupCoreTest,
} from "@core/utils/__tests__/setup/coreMocks"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import { beforeEach, describe, expect, it, vi } from "vitest"

describe("GPEvaluatorAdapter prompt-only handling", () => {
  let adapter: any
  let mockGenome: any
  let evolutionContext: EvolutionContext

  beforeEach(() => {
    setupCoreTest()
    mockRuntimeConstantsForGP()
    evolutionContext = {
      generationId: "gen-1",
      generationNumber: 1,
      runId: "test-run",
    }
    // Create a mock genome using typed factory
    // Note: factory provides setPrecomputedWorkflowData
    mockGenome = undefined
  })

  it("should skip evaluation for prompt-only type", async () => {
    // Dynamic module import so per-test mocks can apply if needed
    const { GPEvaluatorAdapter } = await import("../GPEvaluatorAdapter")
    adapter = new GPEvaluatorAdapter([], "test goal", "test analysis")
    mockGenome = await createMockGenome()

    // Mock the evaluation input to be prompt-only
    const promptOnlyInput: EvaluationInput = {
      type: "prompt-only",
      goal: "Test prompt-only workflow",
      workflowId: "test-wf",
    }

    vi.mocked(mockGenome.getEvaluationInput).mockReturnValue(promptOnlyInput)

    // Call evaluate
    const result = await adapter.evaluate(mockGenome, evolutionContext)

    // Verify the result
    expect(result.success).toBe(true)
    expect(result.usdCost).toBe(0)
    expect(result.data?.fitness?.score).toBe(1.0)
    expect(result.data?.fitness?.accuracy).toBe(1.0)
    expect(result.data?.costOfEvaluation).toBe(0)
    expect(result.data?.feedback).toBe(
      "Prompt-only workflow - evaluation skipped"
    )

    // Verify precomputed data setter was NOT called (since we skipped evaluation)
    expect(mockGenome.setPrecomputedWorkflowData).not.toHaveBeenCalled()
  })

  it("should proceed with normal evaluation for non-prompt-only types", async () => {
    // Reset modules so our per-test mock takes effect
    vi.resetModules()
    vi.doMock("@core/evaluation/evaluators/AggregatedEvaluator", () => ({
      AggregatedEvaluator: class {
        evaluate = vi.fn().mockResolvedValue({
          success: true,
          data: {
            fitness: {
              score: 0.75,
              totalCostUsd: 0.02,
              totalTimeSeconds: 1.0,
              accuracy: 0.8,
            },
            feedback: "ok",
          },
          usdCost: 0.02,
        })
      },
    }))

    const { GPEvaluatorAdapter } = await import("../GPEvaluatorAdapter")
    adapter = new GPEvaluatorAdapter([], "test goal", "test analysis")
    mockGenome = await createMockGenome()

    // Mock the evaluation input to be a different type
    const textInput: EvaluationInput = {
      type: "text",
      goal: "Test text workflow",
      workflowId: "test-wf",
      question: "What is 2+2?",
      answer: "4",
    }

    vi.mocked(mockGenome.getEvaluationInput).mockReturnValue(textInput)

    const result = await adapter.evaluate(mockGenome, evolutionContext)

    // Verify precomputed data was set with our constructor inputs
    expect(mockGenome.setPrecomputedWorkflowData).toHaveBeenCalledWith({
      workflowIO: [],
      newGoal: "test goal",
      problemAnalysis: "test analysis",
    })

    expect(result.success).toBe(true)
    expect(result.data?.fitness?.score).toBe(0.75)
    expect(result.usdCost).toBe(0.02)
  })
})
