/**
 * Model configuration types and default values for the core package
 */

export type ModelName = 
  | "openai/gpt-4.1-nano"
  | "openai/gpt-4.1-mini" 
  | "google/gemini-2.5-flash-lite"
  | "switchpoint/router"
  | "google/gemini-2.5-pro-preview"
  | "anthropic/claude-sonnet-4"
  | "openai/gpt-4o-search-preview"
  | "moonshotai/kimi-k2-instruct"

export interface ModelConfig {
  summary: ModelName
  nano: ModelName
  low: ModelName
  medium: ModelName
  high: ModelName
  default: ModelName
  fitness: ModelName
  reasoning: ModelName
  fallbackOpenRouter: ModelName
}

export interface ModelRuntimeConfig {
  provider: "openai" | "openrouter" | "groq"
  inactive: Set<string>
}

// Default model configuration when no runtime is provided
export const DEFAULT_MODELS: ModelConfig = {
  summary: "google/gemini-2.5-flash-lite",
  nano: "openai/gpt-4.1-nano",
  low: "openai/gpt-4.1-mini",
  medium: "openai/gpt-4.1-mini",
  high: "google/gemini-2.5-pro-preview",
  default: "openai/gpt-4.1-mini",
  fitness: "openai/gpt-4.1-mini",
  reasoning: "openai/gpt-4.1-mini",
  fallbackOpenRouter: "switchpoint/router",
} as const

export const DEFAULT_MODEL_CONFIG: ModelRuntimeConfig = {
  provider: "openrouter",
  inactive: new Set<string>([
    "moonshotai/kimi-k2",
    "x-ai/grok-4",
    "qwen/qwq-32b:free",
  ]),
} as const

export interface RuntimeConfig {
  limits: {
    enableSpendingLimits: boolean
    rateWindowMs: number
    maxRequestsPerWindow: number
  }
  tools: {
    maxStepsVercel: number
  }
}

export const DEFAULT_CONFIG: RuntimeConfig = {
  limits: {
    enableSpendingLimits: true,
    rateWindowMs: 60000,
    maxRequestsPerWindow: 100,
  },
  tools: {
    maxStepsVercel: 5,
  },
}

// Global state for configuration
let _runtimeModels: ModelConfig | null = null
let _runtimeModelConfig: ModelRuntimeConfig | null = null
let _runtimeConfig: RuntimeConfig | null = null

/**
 * Set configuration from runtime (called by app layer)
 */
export function setRuntimeConfig(models: ModelConfig, modelConfig: ModelRuntimeConfig, config: RuntimeConfig): void {
  _runtimeModels = models
  _runtimeModelConfig = modelConfig
  _runtimeConfig = config
}

/**
 * Get current model configuration (runtime if available, defaults otherwise)
 */
export function getModels(): ModelConfig {
  return _runtimeModels ?? DEFAULT_MODELS
}

/**
 * Get current model runtime configuration
 */
export function getModelConfig(): ModelRuntimeConfig {
  return _runtimeModelConfig ?? DEFAULT_MODEL_CONFIG
}

/**
 * Get current runtime configuration
 */
export function getConfig(): RuntimeConfig {
  return _runtimeConfig ?? DEFAULT_CONFIG
}

/**
 * Check if a model is active (not in inactive set)
 */
export function isModelActive(model: ModelName): boolean {
  const config = getModelConfig()
  return !config.inactive.has(model)
}