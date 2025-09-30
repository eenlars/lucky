/**
 * Core configuration provider - singleton access to core configuration.
 * This is the main entry point for configuration access in core.
 */

import { createDefaultCoreConfig, mergeConfig } from "./defaults"
import type { CoreConfig, CoreModelsConfig, CorePathsConfig } from "./types"

export type { CoreConfig, CorePathsConfig, CoreModelsConfig } from "./types"
export { createDefaultCoreConfig, mergeConfig } from "./defaults"

/**
 * Global configuration instance
 */
let globalConfig: CoreConfig | null = null

/**
 * Initialize or update core configuration.
 * Should be called once at application startup, before any other core functionality.
 *
 * @param override - Partial configuration to override defaults
 */
export function initCoreConfig(override?: Partial<CoreConfig>): void {
  if (override) {
    globalConfig = mergeConfig(createDefaultCoreConfig(), override)
  } else {
    globalConfig = createDefaultCoreConfig()
  }
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
export function getDefaultModels() {
  return getCoreConfig().models.defaults
}

/**
 * Check if a tool is inactive
 */
export function isToolInactive(toolName: string): boolean {
  return getCoreConfig().tools.inactive.has(toolName)
}

/**
 * Check if a model is inactive
 */
export function isModelInactive(modelName: string): boolean {
  return getCoreConfig().models.inactive.has(modelName)
}

/**
 * Get the default tools set
 */
export function getDefaultTools(): Set<string> {
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
