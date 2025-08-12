// adapter to use AggregatedEvaluator in genetic programming

import { AggregatedEvaluator } from "@core/evaluation/evaluators/AggregatedEvaluator"
import { Genome } from "@core/improvement/gp/Genome"
import { MockGPEvaluator } from "@core/improvement/gp/resources/debug/MockGPEvaluator"
import { failureTracker } from "@core/improvement/gp/resources/tracker"
import type { EvolutionContext } from "@core/improvement/gp/resources/types"
import { lgg } from "@core/utils/logging/Logger"
import { R } from "@core/utils/types"
import type { WorkflowIO } from "@core/workflow/ingestion/ingestion.types"
import { guard } from "@core/workflow/schema/errorMessages"
import { CONFIG } from "@runtime/settings/constants"
import { JSONN } from "@shared/utils/files/json/jsonParse"
import type { EvolutionEvaluator } from "./EvolutionEvaluator"

/**
 * Adapter that allows AggregatedEvaluator to be used in Genetic Programming.
 * Bridges the gap between genome-based evaluation and workflow-based evaluation.
 */
export class GPEvaluatorAdapter implements EvolutionEvaluator {
  static verbose = CONFIG.logging.override.GP
  private aggregatedEvaluator: AggregatedEvaluator
  private mockEvaluator: MockGPEvaluator

  constructor(
    private workflowCases: WorkflowIO[],
    private newGoal: string,
    private problemAnalysis: string
  ) {
    this.aggregatedEvaluator = new AggregatedEvaluator()
    this.mockEvaluator = new MockGPEvaluator()
    lgg.log(
      `[GPEvaluatorAdapter] Initialized with ${workflowCases.length} workflow cases`
    )

    if (GPEvaluatorAdapter.verbose) {
      lgg.log(
        `[GPEvaluatorAdapter] First case input: ${workflowCases[0]?.workflowInput.substring(0, 100)}`
      )
      lgg.log(
        `[GPEvaluatorAdapter] First case output: ${JSON.stringify(workflowCases[0]?.workflowOutput).substring(0, 100)}`
      )
    }
  }

  async evaluate(
    genome: Genome,
    evolutionContext: EvolutionContext
  ): ReturnType<EvolutionEvaluator["evaluate"]> {
    guard(evolutionContext, "Evolution context is required for GPEvaluation")
    const startTime = Date.now()
    const errors: string[] = []

    lgg.log(
      `[GPEvaluatorAdapter] Starting evaluation of genome ${genome.getWorkflowVersionId()}`
    )

    // Track evaluation attempt
    failureTracker.trackEvaluationAttempt()

    if (GPEvaluatorAdapter.verbose) {
      lgg.log(
        `[GPEvaluatorAdapter] Genome details - Nodes: ${genome.nodes.length}, Genome ID: ${genome.getWorkflowVersionId()}`
      )
    }

    // Use mock evaluator in verbose mode
    if (CONFIG.evolution.GP.verbose) {
      return this.mockEvaluator.evaluate(genome)
    }

    // Check if this is a prompt-only evaluation and skip if so
    const evaluationInput = genome.getEvaluationInput()
    if (evaluationInput.type === "prompt-only") {
      lgg.log(
        `[GPEvaluatorAdapter] Skipping prompt-only evaluation for genome ${genome.getWorkflowVersionId()}`
      )

      // Return mock result with 100% fitness
      return {
        success: true,
        usdCost: 0,
        data: {
          workflowVersionId: genome.getWorkflowVersionId(),
          hasBeenEvaluated: true,
          evaluatedAt: new Date().toISOString(),
          fitness: {
            score: 1.0, // 100% fitness
            totalCostUsd: 0,
            totalTimeSeconds: 0,
            accuracy: 1.0,
            },
          costOfEvaluation: 0,
          errors: [],
          feedback: "Prompt-only workflow - evaluation skipped",
        },
      }
    }

    try {
      if (GPEvaluatorAdapter.verbose) {
        lgg.log(
          `[GPEvaluatorAdapter] Creating workflow instance for evaluation`
        )
      }

      lgg.log(
        `[GPEvaluatorAdapter] Evaluating genome ${genome.getWorkflowVersionId()} on ${this.workflowCases.length} workflow cases`
      )

      // Set pre-computed workflow IO (avoids re-calling prepareProblem)
      lgg.log(
        `[GPEvaluatorAdapter] Setting pre-computed workflow IO for genome ${genome.getWorkflowVersionId()}`
      )

      genome.setPrecomputedWorkflowData({
        workflowIO: this.workflowCases,
        newGoal: this.newGoal,
        problemAnalysis: this.problemAnalysis,
      })

      // Use aggregated evaluator to run workflow on all cases
      lgg.log(
        `[GPEvaluatorAdapter] Starting aggregated evaluation for genome ${genome.getWorkflowVersionId()}`
      )
      const { success, error, data, usdCost } =
        await this.aggregatedEvaluator.evaluate(genome)

      if (!success) {
        lgg.error(
          `[GPEvaluatorAdapter] Aggregated evaluation failed for genome ${genome.getWorkflowVersionId()}: ${error}`
        )
        failureTracker.trackEvaluationFailure() // Track evaluation failure
        return R.error(`Aggregated evaluation failed: ${error}`, usdCost)
      }

      lgg.log(
        `[GPEvaluatorAdapter] Aggregated evaluation succeeded for genome ${genome.getWorkflowVersionId()}`
      )

      const { fitness, feedback } = data

      const cost = usdCost ?? 0
      guard(fitness, `No fitness found in ${genome.getWorkflowVersionId()}`)
      guard(feedback, `No feedback found in ${genome.getWorkflowVersionId()}`)

      const evaluationTime = (Date.now() - startTime) / 1000

      lgg.log(
        `[GPEvaluatorAdapter] Evaluation complete for ${genome.getWorkflowVersionId()} - Score: ${fitness.score.toFixed(3)}, Cost: $${cost.toFixed(4)}, Time: ${evaluationTime.toFixed(1)}s`
      )

      if (GPEvaluatorAdapter.verbose) {
        lgg.log(`[GPEvaluatorAdapter] Detailed results:`, {
          workflowVersionId: genome.getWorkflowVersionId(),
          fitnessScore: fitness.score,
          evaluationCost: cost,
          evaluationTime: evaluationTime,
          workflowNodes: genome.nodes.length,
        })
      }

      return {
        success: true,
        usdCost: cost,
        data: {
          workflowVersionId: genome.getWorkflowVersionId(),
          hasBeenEvaluated: true,
          evaluatedAt: new Date().toISOString(),
          fitness,
          costOfEvaluation: cost,
          errors: [],
          feedback,
        },
      }
    } catch (error) {
      const evaluationTime = (Date.now() - startTime) / 1000
      errors.push(`Evaluation failed: ${error}`)

      lgg.error(
        `[GPEvaluatorAdapter] Evaluation failed for genome with wf_version_id ${genome.getWorkflowVersionId()} after ${evaluationTime.toFixed(1)}s:`,
        error
      )

      failureTracker.trackEvaluationFailure() // Track evaluation failure

      if (GPEvaluatorAdapter.verbose) {
        lgg.error(
          `[GPEvaluatorAdapter] Error details:`,
          JSONN.show({
            workflowVersionId: genome.getWorkflowVersionId(),
            errorMessage: String(error),
            workflowNodes: genome.nodes.length,
            failureTime: evaluationTime,
          })
        )
      }

      // Return low fitness for failed evaluations
      return R.error("Evaluation failed", 0.001)
    }
  }
}
