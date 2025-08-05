import type { EvolutionSettings } from "@improvement/gp/resources/evolution-types"
import { _createDefaultGPConfig } from "@improvement/gp/resources/validation"

/**
 * Create evolution settings with optional overrides
 */
export function createEvolutionSettingsWithConfig(
  overrides?: Partial<EvolutionSettings>
): EvolutionSettings {
  const defaults = _createDefaultGPConfig()
  return { ...defaults, ...overrides }
}

/**
 * Create default evolution settings
 */
export function createDefaultEvolutionSettings(): EvolutionSettings {
  return _createDefaultGPConfig()
}