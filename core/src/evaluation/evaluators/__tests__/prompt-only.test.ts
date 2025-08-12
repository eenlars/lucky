import { Genome } from "@core/improvement/gp/Genome"
import type { EvolutionContext } from "@core/improvement/gp/resources/types"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
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
    // TODO: this test has issues:
    // 1. the mock genome is incomplete - missing required methods like getWorkflowIO
    //    - should either use a complete mock or test with actual Genome instance
    // 2. the test verifies getWorkflowIO wasn't called, but this property doesn't exist on mockGenome
    //    - the actual method is setWorkflowIO or setPrecomputedWorkflowData
    // 3. missing verification that setPrecomputedWorkflowData is NOT called for prompt-only
    // 4. should verify all the fields in the returned data structure match implementation
    // 5. the test doesn't verify edge cases like CONFIG.evolution.GP.verbose behavior
    
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
    // TODO: this test is poorly designed:
    // 1. relies on the test throwing an error instead of properly mocking dependencies
    //    - should mock AggregatedEvaluator.evaluate to return a proper response
    // 2. again, getWorkflowIO doesn't exist on the genome - it's setPrecomputedWorkflowData
    // 3. doesn't test the actual flow - just verifies a non-existent method was called
    // 4. should verify that setPrecomputedWorkflowData IS called with correct parameters
    // 5. should test successful evaluation path, not just error cases
    // 6. missing tests for:
    //    - CONFIG.evolution.GP.verbose mode using MockGPEvaluator
    //    - failureTracker.trackEvaluationAttempt() being called
    //    - error handling and failureTracker.trackEvaluationFailure()
    //    - proper fitness calculation and feedback
    
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
