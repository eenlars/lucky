import { CONFIG } from "@core/core-config/compat"
import type { EvolutionEvaluator } from "@core/evaluation/evaluators/EvolutionEvaluator"
import type { Genome } from "@core/improvement/gp/Genome"
import { lgg } from "@core/utils/logging/Logger"

/**
 * Mock evaluator for debugging purposes.
 * Returns fake evaluation results without actually running workflows.
 */
export class MockGPEvaluator implements EvolutionEvaluator {
  async evaluate(genome: Genome): ReturnType<EvolutionEvaluator["evaluate"]> {
    if (!CONFIG.evolution.GP.verbose) {
      throw new Error("The mock evaluator should only be used in verbose mode")
    }
    lgg.log(`[MockGPEvaluator] Returning mock evaluation for ${genome.getWorkflowVersionId()}`)

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
        },
        hasBeenEvaluated: true,
        evaluatedAt: new Date().toISOString(),
        workflowVersionId: genome.getWorkflowVersionId(),
      },
    }
  }
}
