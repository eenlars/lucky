/**
 * Core configuration provider - singleton access to core configuration.
 * This is the main entry point for configuration access in core.
 */

import { createEvolutionSettings } from "@lucky/shared/contracts/evolution"
import { validateRuntimeConfig } from "@lucky/shared/contracts/runtime"
import type { TypedModelDefaults } from "./compat"
import { createDefaultCoreConfig, mergeConfig } from "./defaults"
import type { CoreConfig, CoreModelsConfig, CorePathsConfig } from "./types"
import { toRuntimeContract } from "./validation"

export { createDefaultCoreConfig, mergeConfig } from "./defaults"
export type { CoreConfig, CoreModelsConfig, CorePathsConfig } from "./types"
export { toRuntimeContract } from "./validation"

/**
 * Global configuration instance
 */
let globalConfig: CoreConfig | null = null

/**
 * Initialize or update core configuration.
 * Should be called once at application startup, before any other core functionality.
 * Validates runtime configuration against the contract schema.
 *
 * @param override - Partial configuration to override defaults
 * @throws ZodError if runtime configuration is invalid
 */
export function initCoreConfig(override?: Partial<CoreConfig>): void {
  const defaults = createDefaultCoreConfig()
  const merged = override ? mergeConfig(defaults, override) : defaults

  const normalized: CoreConfig = {
    ...merged,
    verification: {
      ...merged.verification,
      maxFilesPerWorkflow: merged.verification.maxFilesPerWorkflow,
      enforceFileLimit: merged.verification.enforceFileLimit,
    },
  }

  // Validate runtime configuration subset against contract
  const runtimeConfig = toRuntimeContract(normalized)
  validateRuntimeConfig(runtimeConfig)

  globalConfig = normalized
}

/**
 * Get the current core configuration.
 * Returns the full configuration object.
 * Initializes with defaults if not yet initialized.
 */
export function getCoreConfig(): CoreConfig {
  if (!globalConfig) {
    globalConfig = createDefaultCoreConfig()
  }
  return globalConfig
}

/**
 * Get paths configuration
 */
export function getCorePaths(): CorePathsConfig {
  return getCoreConfig().paths
}

/**
 * Get models configuration
 */
export function getCoreModels(): CoreModelsConfig {
  return getCoreConfig().models
}

/**
 * Get default model names as a convenient object.
 * This matches the signature of getDefaultModels() from runtime.
 */
export function getDefaultModels(): TypedModelDefaults {
  return getCoreConfig().models.defaults as TypedModelDefaults
}

/**
 * Check if a tool is inactive
 */
export function isToolInactive(toolName: string): boolean {
  return getCoreConfig().tools.inactive.includes(toolName)
}

/**
 * Check if a model is inactive
 */
export function isModelInactive(modelName: string): boolean {
  return getCoreConfig().models.inactive.includes(modelName)
}

/**
 * Get the default tools array
 */
export function getDefaultTools(): string[] {
  return getCoreConfig().tools.defaultTools
}

/**
 * Check if logging is enabled for a component.
 * Returns true only if the component override is explicitly set to true.
 * Returns false for undefined or false values.
 */
export function isLoggingEnabled(component: string): boolean {
  const config = getCoreConfig()
  const override = config.logging.override[component as keyof typeof config.logging.override]
  return override === true
}

/**
 * Create evolution settings with optional overrides
 * Seeds from live core config to carry through configured defaults
 */
export function createEvolutionSettingsWithConfig(overrides?: any) {
  const liveConfig = getCoreConfig()
  const runtimeConfig = toRuntimeContract(liveConfig)

  // Seed with live core config values (e.g., maxCostUSD from limits)
  const baseSettings = {
    mode: "GP" as const,
    ...runtimeConfig.evolution.GP,
    maxCostUSD: runtimeConfig.limits.maxCostUsdPerRun,
  }

  return createEvolutionSettings({ ...baseSettings, ...overrides })
}
