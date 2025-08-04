import { getConfig } from "@/config"
import { lgg } from "@/utils/logging/Logger"
import { Genome } from "@gp/Genome"
import type { EvolutionEvaluator } from "@improvement/evaluators/EvolutionEvaluator"

/**
 * Mock evaluator for debugging purposes.
 * Returns fake evaluation results without actually running workflows.
 */
export class MockGPEvaluator implements EvolutionEvaluator {
  async evaluate(genome: Genome): ReturnType<EvolutionEvaluator["evaluate"]> {
    if (!getConfig().evolution.GP.verbose) {
      throw new Error("The mock evaluator should only be used in verbose mode")
    }
    lgg.log(
      `[MockGPEvaluator] Returning mock evaluation for ${genome.getWorkflowVersionId()}`
    )

    const mockScore = Math.random() * 100
    const mockTime = Math.random() * 30

    // In mock mode, we skip database updates since workflow isn't actually run

    return {
      success: true,
      usdCost: 0.01,
      data: {
        errors: [],
        feedback: "test feedback",
        costOfEvaluation: 0.01,
        fitness: {
          score: mockScore,
          totalCostUsd: 0.01,
          totalTimeSeconds: mockTime,
          accuracy: Math.random(),
          novelty: Math.random(),
        },
        hasBeenEvaluated: true,
        evaluatedAt: new Date().toISOString(),
        workflowVersionId: genome.getWorkflowVersionId(),
      },
    }
  }
}
