/**
 * Evolution and genetic programming configuration contracts.
 * Defines settings for workflow optimization via GP or iterative improvement.
 */

import { z } from "zod"

// ============================================================================
// MUTATION PARAMETERS
// ============================================================================

export const MutationParamsSchema = z.object({
  mutationInstructions: z.string().default("Apply semantic mutations to improve workflow performance"),
})

export type MutationParams = z.infer<typeof MutationParamsSchema>

// ============================================================================
// EVOLUTION SETTINGS (Genetic Programming)
// ============================================================================

export const EvolutionSettingsSchema = z.object({
  mode: z.literal("GP"),

  // Core parameters
  populationSize: z.number().int().positive().default(4),
  generations: z.number().int().positive().default(3),

  // Selection parameters
  tournamentSize: z.number().int().positive().default(5),
  eliteSize: z.number().int().positive().default(2),

  // Practical limits
  maxEvaluationsPerHour: z.number().int().positive().default(300),
  maxCostUSD: z.number().positive().default(30.0),

  // Evaluation
  evaluationDataset: z.string().default(""),
  baselineComparison: z.boolean().default(false),

  // Mutation parameters
  mutationParams: MutationParamsSchema.default({}),
  crossoverRate: z.number().min(0).max(1).default(0.7),
  mutationRate: z.number().min(0).max(1).default(0.3),

  offspringCount: z.number().int().positive().default(2),
  numberOfParentsCreatingOffspring: z.number().int().positive().default(2),

  immigrantRate: z.number().int().positive().optional(),
  immigrantInterval: z.number().int().positive().optional(),
})

export type EvolutionSettings = z.infer<typeof EvolutionSettingsSchema>

/**
 * Default evolution settings extracted from schema
 */
export const DEFAULT_EVOLUTION_SETTINGS: EvolutionSettings = EvolutionSettingsSchema.parse({ mode: "GP" })

/**
 * Convert evolution settings to human-readable string
 */
export function evolutionSettingsToString(settings: EvolutionSettings): string {
  return `
  Mode: ${settings.mode}
  Population: ${settings.populationSize}
  Generations: ${settings.generations}
  Crossover rate: ${settings.crossoverRate}
  Mutation rate: ${settings.mutationRate}
  Parents: ${settings.numberOfParentsCreatingOffspring}
  Offspring count: ${settings.offspringCount}
  Immigrant rate: ${settings.immigrantRate ?? "N/A"}
  Immigrant interval: ${settings.immigrantInterval ?? "N/A"}
  Evaluation dataset: ${settings.evaluationDataset || "None"}
  Baseline comparison: ${settings.baselineComparison}
  `
}

// ============================================================================
// ITERATIVE IMPROVEMENT CONFIG
// ============================================================================

/**
 * Configuration for iterative (non-GP) improvement mode.
 * Runs a fixed number of iterations refining a single workflow.
 */
export interface IterativeConfig {
  mode: "iterative"
  iterations: number
  question: unknown // EvaluationInput - avoid circular dependency
}

/**
 * Helper to create evolution settings with custom overrides
 */
export function createEvolutionSettings(overrides?: Partial<EvolutionSettings>): EvolutionSettings {
  return EvolutionSettingsSchema.parse({ mode: "GP", ...overrides })
}
