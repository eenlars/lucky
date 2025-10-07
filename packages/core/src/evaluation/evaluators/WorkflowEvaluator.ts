// abstract base class for workflow evaluation strategies

import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import type { InvocationSummary } from "@core/messages/summaries/createSummary"
import type { Workflow } from "@core/workflow/Workflow"
import type { WorkflowIO } from "@core/workflow/ingestion/ingestion.types"
import { guard } from "@core/workflow/schema/errorMessages"
import type { RS } from "@lucky/shared"

export interface WorkflowEvaluationResult {
  fitness: FitnessOfWorkflow
  feedback: string
  transcript: string
  cost: number
  summaries: InvocationSummary[]
}

/**
 * Abstract base class for workflow evaluation.
 * Implementations define how to evaluate a workflow against multiple workflow cases.
 */
export abstract class WorkflowEvaluator {
  /**
   * Evaluates a workflow against a set of workflow cases.
   * @param workflow The workflow to evaluate
   * @param workflowCases Array of workflow cases to test the workflow against
   * @returns Aggregated evaluation result
   */
  abstract evaluate(workflow: Workflow, workflowCases: WorkflowIO[]): Promise<RS<WorkflowEvaluationResult>>

  /**
   * Helper method to aggregate multiple fitness scores.
   * Can be overridden by subclasses for custom aggregation logic.
   */
  protected aggregateFitness(fitnesses: FitnessOfWorkflow[]): FitnessOfWorkflow {
    guard(fitnesses, "Cannot aggregate empty fitness array")

    // default: average all metrics
    const avgScore = fitnesses.reduce((sum, f) => sum + f.score, 0) / fitnesses.length
    const totalCost = fitnesses.reduce((sum, f) => sum + f.totalCostUsd, 0)
    const totalTime = fitnesses.reduce((sum, f) => sum + f.totalTimeSeconds, 0)
    const avgAccuracy = fitnesses.reduce((sum, f) => sum + f.accuracy, 0) / fitnesses.length

    return {
      score: Math.round(avgScore),
      totalCostUsd: totalCost,
      totalTimeSeconds: totalTime,
      accuracy: Math.round(avgAccuracy),
    }
  }
}
