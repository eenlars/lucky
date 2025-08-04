/**
 * Consumer module that connects runtime configuration to the core package
 *
 * This module acts as a bridge, taking runtime settings and passing them
 * to the core package through its interfaces, enabling the core to access
 * model and configuration settings without direct imports.
 */

import { setRuntimeConfig } from "@packages/core/interfaces/models"
import { CONFIG, MODELS } from "./settings/constants"
import { MODEL_CONFIG } from "./settings/models"

/**
 * Initialize core package with runtime configuration
 * Call this once during app startup
 */
export function initializeCoreRuntime(): void {
  // Convert our runtime models to the core interface format
  const coreModels = {
    summary: MODELS.summary,
    nano: MODELS.nano,
    low: MODELS.low,
    medium: MODELS.medium,
    high: MODELS.high,
    default: MODELS.default,
    fitness: MODELS.fitness,
    reasoning: MODELS.reasoning,
    fallbackOpenRouter: MODELS.fallbackOpenRouter,
  }

  // Convert runtime model config
  const coreModelConfig = {
    provider: MODEL_CONFIG.provider,
    inactive: MODEL_CONFIG.inactive,
  }

  // Convert runtime config to core interface
  const coreConfig = {
    limits: {
      enableSpendingLimits: CONFIG.limits.enableSpendingLimits,
      rateWindowMs: CONFIG.limits.rateWindowMs,
      maxRequestsPerWindow: CONFIG.limits.maxRequestsPerWindow,
    },
    tools: {
      maxStepsVercel: CONFIG.tools.maxStepsVercel,
    },
  }

  // Initialize the core package with runtime configuration
  setRuntimeConfig(coreModels, coreModelConfig, coreConfig)
}
