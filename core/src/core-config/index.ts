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
let globalConfig: CoreConfig = createDefaultCoreConfig()

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
 */
export function getCoreConfig(): CoreConfig {
  return globalConfig
}

/**
 * Get paths configuration
 */
export function getCorePaths(): CorePathsConfig {
  return globalConfig.paths
}

/**
 * Get models configuration
 */
export function getCoreModels(): CoreModelsConfig {
  return globalConfig.models
}

/**
 * Get default model names as a convenient object.
 * This matches the signature of getDefaultModels() from runtime.
 */
export function getDefaultModels() {
  return globalConfig.models.defaults
}

/**
 * Check if a tool is inactive
 */
export function isToolInactive(toolName: string): boolean {
  return globalConfig.tools.inactive.has(toolName)
}

/**
 * Check if a model is inactive
 */
export function isModelInactive(modelName: string): boolean {
  return globalConfig.models.inactive.has(modelName)
}

/**
 * Get the default tools set
 */
export function getDefaultTools(): Set<string> {
  return globalConfig.tools.defaultTools
}