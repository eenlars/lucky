/**
 * Model configuration types and default values for the core package
 */

import type {
  FlowEvolutionConfig,
  FlowPathsConfig,
  FlowRuntimeConfig,
  FullFlowRuntimeConfig,
} from "@/interfaces/runtimeConfig"
import type {
  AllowedModelName,
  ModelName,
  Provider,
} from "@/utils/models/models"
import { DEFAULT_MODELS, MODEL_CONFIG } from "@/utils/models/models"

export interface ModelConfig {
  summary: AllowedModelName
  nano: AllowedModelName
  low: AllowedModelName
  medium: AllowedModelName
  high: AllowedModelName
  default: AllowedModelName
  fitness: AllowedModelName
  reasoning: AllowedModelName
  fallback: AllowedModelName
}

export interface ModelRuntimeConfig {
  provider: Provider
  inactive: Set<string>
  models: ModelConfig
}

export const DEFAULT_MODEL_CONFIG: ModelRuntimeConfig = {
  provider: MODEL_CONFIG.provider,
  models: DEFAULT_MODELS,
  inactive: MODEL_CONFIG.inactive,
} as const

// Global state for configuration
let _runtimeModels: ModelConfig
let _runtimeModelConfig: ModelRuntimeConfig
let _runtimeConfig: FullFlowRuntimeConfig

/**
 * Set configuration from runtime (called by app layer)
 */
export function setRuntimeConfig(
  models: ModelConfig,
  modelConfig: ModelRuntimeConfig,
  config: FullFlowRuntimeConfig
): void {
  _runtimeModels = models
  _runtimeModelConfig = modelConfig
  _runtimeConfig = config
}

/**
 * Get current model configuration (runtime if available, defaults otherwise)
 */
export function getModels(): ModelConfig {
  return { ...DEFAULT_MODEL_CONFIG.models, ..._runtimeModels }
}

/**
 * Get current model runtime configuration
 */
export function getModelConfig(): ModelRuntimeConfig {
  return { ...DEFAULT_MODEL_CONFIG, ..._runtimeModelConfig }
}

/**
 * Get current runtime configuration
 */
export function getAllConfig(): FullFlowRuntimeConfig {
  return _runtimeConfig
}

export function getConfig(): FlowRuntimeConfig {
  return _runtimeConfig.CONFIG
}

export function getEvolutionConfig(): FlowEvolutionConfig {
  return _runtimeConfig.CONFIG.evolution
}

export function getPaths(): FlowPathsConfig {
  return _runtimeConfig.PATHS
}

export function getModelsConfig(): ModelRuntimeConfig {
  return _runtimeConfig.MODELS
}

/**
 * Check if a model is active (not in inactive set)
 */
export function isModelActive(model: ModelName): boolean {
  const config = getModelConfig()
  return !config.inactive.has(model)
}
