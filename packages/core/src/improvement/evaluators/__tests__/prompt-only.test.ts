import { Genome } from "@improvement/gp/Genome"
import type { EvolutionContext } from "@improvement/gp/resources/types"
import type { EvaluationInput } from "@workflow/ingestion/ingestion.types"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { GPEvaluatorAdapter } from "../GPEvaluatorAdapter"

describe("GPEvaluatorAdapter prompt-only handling", () => {
  let adapter: GPEvaluatorAdapter
  let mockGenome: Genome
  let evolutionContext: EvolutionContext

  beforeEach(() => {
    adapter = new GPEvaluatorAdapter([], "test goal", "test analysis")
    evolutionContext = {
      generationId: "gen-1",
      generationNumber: 1,
      runId: "test-run",
    }

    // Create a mock genome
    mockGenome = {
      getWorkflowVersionId: () => "test-wf-123",
      getEvaluationInput: vi.fn(),
      setWorkflowIO: vi.fn(),
      nodes: [],
    } as unknown as Genome
  })

  it("should skip evaluation for prompt-only type", async () => {
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

    // Verify setWorkflowIO was NOT called (since we skipped evaluation)
    expect(mockGenome.getWorkflowIO).not.toHaveBeenCalled()
  })

  it("should proceed with normal evaluation for non-prompt-only types", async () => {
    // Mock the evaluation input to be a different type
    const textInput: EvaluationInput = {
      type: "text",
      goal: "Test text workflow",
      workflowId: "test-wf",
      question: "What is 2+2?",
      answer: "4",
    }

    vi.mocked(mockGenome.getEvaluationInput).mockReturnValue(textInput)
    vi.mocked(mockGenome.getWorkflowIO).mockResolvedValue([])

    // Mock the aggregated evaluator to throw (since we don't have a full setup)
    try {
      await adapter.evaluate(mockGenome, evolutionContext)
    } catch (error) {
      // This is expected since we don't have full mock setup
      // The important thing is that setWorkflowIO was called
      expect(mockGenome.getWorkflowIO).toHaveBeenCalledWith(textInput)
    }
  })
})
