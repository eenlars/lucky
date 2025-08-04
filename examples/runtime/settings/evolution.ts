import type { EvolutionSettings } from "@/improvement/gp/resources/evolution-types"
import { _createDefaultGPConfig } from "@/improvement/gp/resources/validation"
import type { FlowEvolutionConfig } from "@/interfaces/runtimeConfig"

// evolution runtime configuration
export const EVOLUTION_CONFIG: FlowEvolutionConfig = {
  mode: "GP",
  generationAmount: 3,
  initialPopulationMethod: "random",
  initialPopulationFile: null,
  GP: {
    ..._createDefaultGPConfig(),
    populationSize: 4, // Minimum viable population for GP operations is 4
    verbose: false, // this is a fake run just to see the logs.
    maximumTimeMinutes: 700,
  },
} as const

// Create evolution settings with optional overrides
export function createEvolutionSettingsWithConfig(
  overrides?: Partial<EvolutionSettings>
): EvolutionSettings {
  const defaults = _createDefaultGPConfig()
  return { ...defaults, ...overrides }
}

// Export alias for backward compatibility
export function createDefaultEvolutionSettings(): EvolutionSettings {
  return _createDefaultGPConfig()
}

