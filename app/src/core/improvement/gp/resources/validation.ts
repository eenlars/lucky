/**
 * Evolution configuration validation for genetic programming
 */

import type { EvolutionSettings, _MutationParams } from "./evolution-types"

/**
 * Validation errors for evolution configuration
 */
export class EvolutionSettingsValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EvolutionSettingsValidationError"
  }
}

/**
 * Validate evolution configuration for genetic programming
 */
export function validateEvolutionSettings(config: EvolutionSettings): void {
  const errors: string[] = []

  // Core GP Requirements
  if (config.populationSize < 2) {
    errors.push(
      `Population size (${config.populationSize}) insufficient for genetic programming. Crossover requires at least 2 individuals. Set CONFIG.evolution.GP.populationSize to at least 4 for effective evolution.`
    )
  }

  if (config.populationSize < config.numberOfParentsCreatingOffspring) {
    errors.push(
      `Population size (${config.populationSize}) is smaller than required parent amount (${config.numberOfParentsCreatingOffspring}). Increase populationSize or decrease numberOfParentsCreatingOffspring.`
    )
  }

  if (config.offspringCount <= 0) {
    errors.push(
      `Lambda offspring to produce (${config.offspringCount}) must be greater than 0. Check populationSize calculation.`
    )
  }

  // Logical Constraints
  if (config.crossoverRate + config.mutationRate > 1.0) {
    errors.push(
      `Crossover rate (${config.crossoverRate}) + mutation rate (${config.mutationRate}) exceeds 1.0. Probabilities must sum to ≤ 1.0.`
    )
  }

  if (config.tournamentSize > config.populationSize) {
    errors.push(
      `Tournament size (${config.tournamentSize}) cannot exceed population size (${config.populationSize}).`
    )
  }

  if (config.eliteSize > config.populationSize) {
    errors.push(
      `Elite size (${config.eliteSize}) cannot exceed population size (${config.populationSize}).`
    )
  }

  // Resource Limits
  if (config.maxCostUSD <= 0) {
    errors.push(`Max cost USD (${config.maxCostUSD}) must be greater than 0.`)
  }

  if (config.maxEvaluationsPerHour <= 0) {
    errors.push(
      `Max evaluations per hour (${config.maxEvaluationsPerHour}) must be greater than 0.`
    )
  }

  if (config.generations <= 0) {
    errors.push(`Generations (${config.generations}) must be greater than 0.`)
  }

  // GP-Specific Logic
  if (config.crossoverRate > 0 && config.numberOfParentsCreatingOffspring < 2) {
    errors.push(
      `Crossover is enabled (rate: ${config.crossoverRate}) but numberOfParentsCreatingOffspring (${config.numberOfParentsCreatingOffspring}) is less than 2. Crossover requires at least 2 parents.`
    )
  }

  // Performance Warnings (not errors)
  const warnings: string[] = []

  if (config.populationSize < 4) {
    warnings.push(
      `Population size (${config.populationSize}) is very small. Consider using at least 4-10 individuals for effective genetic programming.`
    )
  }

  if (config.offspringCount < 2) {
    warnings.push(
      `Lambda offspring (${config.offspringCount}) is very small. Consider producing more offspring per generation.`
    )
  }

  // Throw if errors found
  if (errors.length > 0) {
    const errorMessage = [
      "Evolution configuration validation failed:",
      ...errors.map((e) => `  • ${e}`),
      "",
      warnings.length > 0 ? "Warnings:" : "",
      ...warnings.map((w) => `  ⚠ ${w}`),
    ]
      .filter(Boolean)
      .join("\n")

    throw new EvolutionSettingsValidationError(errorMessage)
  }

  // Log warnings if any
  if (warnings.length > 0) {
    console.warn("Evolution configuration warnings:")
    warnings.forEach((w) => console.warn(`  ⚠ ${w}`))
  }
}

/**
 * Create default evolution configuration using constants from runtime/constants.ts
 */
export function _createDefaultEvolutionSettings(
  overrides?: Partial<EvolutionSettings>
): EvolutionSettings {
  // Default values when no config is provided
  const defaultPopulationSize = 4
  const defaultGenerations = 3
  const config: EvolutionSettings = {
    mode: "GP",
    // Core parameters
    populationSize: defaultPopulationSize,
    generations: defaultGenerations,

    // Selection parameters (dynamic based on population size)
    tournamentSize: Math.max(
      2,
      Math.min(5, Math.floor(defaultPopulationSize * 0.3))
    ),
    eliteSize: Math.max(1, Math.floor(defaultPopulationSize * 0.2)),

    // Practical limits
    maxEvaluationsPerHour: 100,
    maxCostUSD: 100,

    // Evaluation
    evaluationDataset: "store_extraction",
    baselineComparison: false,

    // Genetic operators
    mutationParams: {
      mutationInstructions: "mutate the workflow config",
    },
    crossoverRate: 0.6,
    mutationRate: 0.3,

    // Advanced features
    offspringCount: Math.max(1, Math.floor(defaultPopulationSize * 0.75)),
    numberOfParentsCreatingOffspring: 2,
    immigrantRate: 3,
    immigrantInterval: 5,
    noveltyWeight: 0.2,

    ...overrides,
  } as const

  // Validate the configuration before returning
  validateEvolutionSettings(config)

  return config
}
