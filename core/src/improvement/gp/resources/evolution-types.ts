/**
 * Evolution configuration types and utilities
 */

import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"

export interface CulturalConfig {
  mode: "cultural"
  iterations: number
  question: EvaluationInput
}

export interface _MutationParams {
  mutationInstructions: string
}

/**
 * Comprehensive evolution configuration with optional advanced features
 */
export interface EvolutionSettings {
  mode: "GP"
  // Core parameters
  populationSize: number
  generations: number

  // Selection parameters
  tournamentSize: number
  eliteSize: number // Number of best to keep

  // Practical limits
  maxEvaluationsPerHour: number
  maxCostUSD: number

  // Evaluation
  evaluationDataset: string // Path to evaluation data
  baselineComparison: boolean // Compare against baseline

  // Mutation parameters
  mutationParams: _MutationParams
  crossoverRate: number
  mutationRate: number

  offspringCount: number // number of offspring to produce (lambda)
  numberOfParentsCreatingOffspring: number // number of parents participating in creating offspring (usually 2, rho)

  noveltyWeight?: number // Weight for novelty vs performance (0-1)
  immigrantRate?: number // immigrants per N generations
  immigrantInterval?: number // how often to add immigrants
}

export function evolutionSettingsToString(settings: EvolutionSettings): string {
  return `
  Mode: ${settings.mode}
  Population: ${settings.populationSize}
    Generations: ${settings.generations}
  Crossover rate: ${settings.crossoverRate}
  Mutation rate: ${settings.mutationRate}
  Parents: ${settings.numberOfParentsCreatingOffspring}
  Offspring count: ${settings.offspringCount}
  Novelty weight: ${settings.noveltyWeight}
  Immigrant rate: ${settings.immigrantRate}
  Immigrant interval: ${settings.immigrantInterval}
  Evaluation dataset: ${settings.evaluationDataset}
  Baseline comparison: ${settings.baselineComparison}
  `
}
