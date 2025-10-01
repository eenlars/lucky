/**
 * Simplified GP types focused on prompt evolution research
 */

import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

/**
 * Evolution-scoped identifiers/state passed around during a run.
 * Used to tag genomes, evaluations, and DB writes with run/generation IDs.
 */
export interface EvolutionContext {
  /** Unique run identifier for the overall evolution session */
  runId: string
  /** Unique ID of the current generation within the run */
  generationId: string
  /** Zero-based generation index within the run */
  generationNumber: number
  /** Optional parent genome workflow version IDs that produced this genome */
  parentIds?: string[]
}

/**
 * Workflow genome extends workflow config with evolution metadata.
 */
export interface WorkflowGenome extends WorkflowConfig {
  _evolutionContext: EvolutionContext
  parentWorkflowVersionIds: string[]
  createdAt: string
  evaluationResults?: GenomeEvaluationResults
}

/**
 * Evaluation result and metadata for a genome.
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
 * Aggregated statistics over the current generation/population.
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
