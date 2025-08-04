import type { EvolutionSettings } from "@/core/improvement/gp/resources/evolution-types"
import { validateEvolutionSettingsSimple } from "@/core/improvement/gp/resources/validation"

// evolution runtime configuration
export const EVOLUTION_CONFIG = {
  culturalIterations: 30,
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

// Export alias for backward compatibility
export function validateEvolutionSettings(
  settings: EvolutionSettings
): boolean {
  return validateEvolutionSettingsSimple(settings)
}
