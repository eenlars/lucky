/**
 * Simplified GP types focused on prompt evolution research
 */

import type { EvolutionContext } from "@/core/improvement/gp/resources/types"
import type { FitnessOfWorkflow } from "@workflow/actions/analyze/calculate-fitness/fitness.types"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"

/**
 * Type safety for generation-related values to prevent confusion
 */

/**
 * Workflow genome extends node config with evolution metadata
 */
export interface WorkflowGenome extends WorkflowConfig {
  _evolutionContext: EvolutionContext
  parentWorkflowVersionIds: string[]
  createdAt: string
  evaluationResults?: GenomeEvaluationResults
}

/**
 * Evaluation result for a genome
 */
export interface GenomeEvaluationResults {
  workflowVersionId: string
  hasBeenEvaluated: boolean // whether the genome has been running and has evaluated with a fitness score
  evaluatedAt: string
  fitness: FitnessOfWorkflow | null // Primary objective (accuracy)
  costOfEvaluation: number // USD cost of evaluation
  errors: string[] // Any errors during evaluation
  feedback: string | null // Feedback from the evaluation
}

/**
 * Population statistics for tracking
 */
export interface PopulationStats {
  generation: number
  bestFitness: number
  worstFitness: number
  avgFitness: number
  fitnessStdDev: number
  evaluationCost: number // Total cost so far
  evaluationsPerHour: number
  improvementRate: number // Fitness improvement over time
}
