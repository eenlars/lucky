import { getModelSettings } from "@utils/config/runtimeConfig"
import {
  CURRENT_PROVIDER,
  getActiveModels,
  getInactiveModels,
} from "@utils/models/functions"
import type {
  ActiveKeys,
  LuckyProvider,
  ModelPricing,
} from "@utils/models/models.types"

export const providers = {
  // Direct OpenAI API
  openai: {
    "gpt-4.1-nano": {
      input: 0.1,
      "cached-input": 0.025,
      output: 0.4,
      info: "IQ:6/10;speed:fast;pricing:low;",
      context_length: 1047576,
      active: true,
    },
    "gpt-4.1-mini": {
      input: 0.4,
      "cached-input": 0.1,
      output: 1.6,
      info: "IQ:7/10;speed:fast;pricing:medium;",
      context_length: 1047576,
      active: true,
    },
    "gpt-4o-search-preview": {
      input: 2.5,
      "cached-input": 0.833333,
      output: 10,
      info: "IQ:8/10;speed:medium;pricing:medium;",
      context_length: 128000,
      active: true,
    },
  },

  // OpenRouter API (different model names)
  openrouter: {
    "google/gemini-2.5-flash-lite": {
      input: 0.15,
      "cached-input": 0.06,
      output: 0.6,
      info: "IQ:5/10;speed:fast;pricing:low;",
      context_length: 1048576,
      active: true,
    },
    "google/gemini-2.5-pro-preview": {
      input: 1.25,
      "cached-input": 0.416667,
      output: 10,
      info: "IQ:7/10;speed:medium;pricing:medium;",
      context_length: 1048576,
      active: true,
    },
    "anthropic/claude-sonnet-4": {
      input: 3,
      "cached-input": 1.166667,
      output: 15,
      info: "IQ:8/10;speed:medium;pricing:medium;",
      context_length: 1047576,
      active: true,
    },
    "switchpoint/router": {
      input: 0.85,
      "cached-input": 0.283333,
      output: 3.4,
      context_length: 131072,
      info: "IQ:8/10;speed:medium;pricing:medium;",
      active: true,
    },
    "moonshotai/kimi-k2": {
      input: 0.5,
      "cached-input": 0.1,
      output: 1.5,
      info: "IQ:6/10;speed:medium;pricing:medium;",
      context_length: 128000,
      active: false,
    },
    "moonshotai/kimi-k2-instruct": {
      input: 0.5,
      "cached-input": 0.1,
      output: 1.5,
      info: "IQ:6/10;speed:medium;pricing:medium;",
      context_length: 128000,
      active: false,
    },
    "x-ai/grok-4": {
      input: 2.0,
      "cached-input": 0.5,
      output: 8.0,
      info: "IQ:7/10;speed:medium;pricing:high;",
      context_length: 131072,
      active: false,
    },
    "qwen/qwq-32b:free": {
      input: 0,
      "cached-input": 0,
      output: 0,
      info: "IQ:6/10;speed:slow;pricing:low;",
      context_length: 32768,
      active: false,
    },
    "deepseek/deepseek-r1-0528:free": {
      input: 0,
      "cached-input": 0,
      output: 0,
      info: "IQ:7/10;speed:slow;pricing:low;",
      context_length: 32768,
      active: false,
    },
  },

  // Groq API
  groq: {
    "llama-3.1-70b-versatile": {
      input: 0.5,
      "cached-input": 0.1,
      output: 0.8,
      info: "IQ:7/10;speed:fast;pricing:low;",
      context_length: 131072,
      active: false,
    },
  },
} as const satisfies Record<LuckyProvider, Record<string, ModelPricing>>

// DO NOT CHANGE THIS OR ANY TYPE WITHOUT CONSENT
// Generate flat pricing object for backward compatibility
export const pricing = Object.fromEntries(
  Object.entries(providers).flatMap(([provider, models]) =>
    Object.entries(models).map(([model, config]) => {
      // For openrouter, the model name already includes the provider prefix
      // For openai and groq, we need to add the provider prefix
      const modelName =
        provider === "openrouter" ? model : `${provider}/${model}`
      return [modelName, config]
    })
  )
) as Record<string, ModelPricing>

// Only allow active models from the current provider
export type AllowedModelName = ActiveKeys<
  (typeof providers)[typeof CURRENT_PROVIDER]
>

export type ModelName = keyof (typeof providers)[typeof CURRENT_PROVIDER]

/* ---------- MODELS - compile-time guarded ---------- */
export const DEFAULT_MODELS = {
  summary: "google/gemini-2.5-flash-lite",
  nano: "google/gemini-2.5-flash-lite",
  low: "google/gemini-2.5-flash-lite",
  medium: "google/gemini-2.5-pro-preview",
  high: "google/gemini-2.5-pro-preview",
  /** Default when a task declares no preference */
  default: "google/gemini-2.5-flash-lite",
  fitness: "google/gemini-2.5-pro-preview",
  reasoning: "anthropic/claude-sonnet-4",
  fallback: "switchpoint/router",
} as const satisfies Record<string, AllowedModelName>

// Model runtime configuration
export const DEFAULT_MODEL_CONFIG = {
  provider: CURRENT_PROVIDER,
  activeModels: getActiveModels(),
  inactiveModels: getInactiveModels(),
  // Backward compatibility
  inactive: new Set(getInactiveModels()),
} as const

// Create type-safe active model subset - ActiveModelName should be assignable to ModelName
export type ActiveModelName = ModelName

// Type guard to check if a model is active
export function isActiveModel(model: ModelName): model is ActiveModelName {
  return pricing[model]?.active === true
}

/**
 * Check if a model is active (not in inactive set)
 */
export function isModelActive(model: ModelName): boolean {
  const config = getModelSettings()
  return !config.inactive.has(model)
}

// Export legacy names for backward compatibility
export const MODELS = DEFAULT_MODELS
export const MODEL_CONFIG = DEFAULT_MODEL_CONFIG

// Export types that may be used elsewhere
export type TokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  // AI SDK format
  inputTokens?: number
  outputTokens?: number
  cachedInputTokens?: number
}
