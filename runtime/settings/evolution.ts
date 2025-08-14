import type { EvolutionSettings } from "@core/improvement/gp/resources/evolution-types"

// evolution runtime configuration
export const EVOLUTION_CONFIG = {
  iterativeIterations: 30,
  GP: {
    generations: 3,
    populationSize: 4, // Minimum viable population for GP operations is 4
    verbose: false, // this is a fake run just to see the logs.
    initialPopulationMethod: "random" as "random" | "baseWorkflow" | "prepared",
    initialPopulationFile: "", // Will be set in server-only code
    maximumTimeMinutes: 700,
  },
} as const

// Default evolution settings
export function createDefaultEvolutionSettings(): EvolutionSettings {
  return {
    mode: "GP",
    populationSize: 10,
    generations: 10,
    tournamentSize: 5,
    eliteSize: 2,
    maxEvaluationsPerHour: 300,
    maxCostUSD: 10.0,
    evaluationDataset: "",
    baselineComparison: false,
    mutationParams: {
      mutationInstructions:
        "Apply semantic mutations to improve workflow performance",
    },
    crossoverRate: 0.7,
    mutationRate: 0.3,
    offspringCount: 2,
    numberOfParentsCreatingOffspring: 2,
  }
}

// Create evolution settings with optional overrides
export function createEvolutionSettingsWithConfig(
  overrides?: Partial<EvolutionSettings>
): EvolutionSettings {
  const defaults = createDefaultEvolutionSettings()
  return { ...defaults, ...overrides }
}

// Validate evolution settings
export function validateEvolutionSettings(
  settings: EvolutionSettings
): boolean {
  if (settings.populationSize <= 0) return false
  if (settings.generations <= 0) return false
  if (settings.maxCostUSD <= 0) return false
  if (settings.tournamentSize <= 0) return false
  if (settings.crossoverRate < 0 || settings.crossoverRate > 1) return false
  if (settings.mutationRate < 0 || settings.mutationRate > 1) return false
  if (settings.offspringCount < 0) return false
  if (settings.numberOfParentsCreatingOffspring <= 0) return false
  return true
}
