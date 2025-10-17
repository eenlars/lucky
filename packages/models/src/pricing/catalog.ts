/**
 * Model Catalog - Single source of truth for model definitions and pricing
 *
 * This catalog defines all available models across all providers with their
 * pricing, capabilities, and metadata.
 * from @lucky/shared.
 *
 * @module pricing/catalog
 */

import { type ModelEntry, providerNameSchema } from "@lucky/shared"
import { OPENROUTER_MODELS } from "./openrouter-models"

/**
 * Model catalog - comprehensive list of all available models
 */
const RAW_MODEL_CATALOG: any[] = [
  // ============================================================================
  // OpenAI Direct API
  // ============================================================================

  // GPT-5 Series

  {
    id: "openai#gpt-5-codex",
    provider: "openai",
    model: "gpt-5-codex",
    input: 1.25,
    output: 10,
    cachedInput: 0.125,
    contextLength: 400000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 9,
    pricingTier: "medium",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-5",
    provider: "openai",
    model: "gpt-5",
    input: 1.25,
    output: 10,
    cachedInput: 0.125,
    contextLength: 400000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: true,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 9,
    pricingTier: "medium",
    active: true,
  },

  {
    id: "openai#gpt-5-chat",
    provider: "openai",
    model: "gpt-5-chat",
    input: 1.25,
    output: 10,
    cachedInput: 0.125,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 9,
    pricingTier: "medium",
    active: true,
  },

  {
    id: "openai#gpt-5-mini",
    provider: "openai",
    model: "gpt-5-mini",
    input: 0.25,
    output: 2,
    cachedInput: 0.025,
    contextLength: 400000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 8,
    pricingTier: "low",
    active: true,
  },

  {
    id: "openai#gpt-5-nano",
    provider: "openai",
    model: "gpt-5-nano",
    input: 0.05,
    output: 0.4,
    cachedInput: 0.005,
    contextLength: 400000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 7,
    pricingTier: "low",
    active: true,
  },

  // o-series (Reasoning Models)
  {
    id: "openai#o1-pro",
    provider: "openai",
    model: "o1-pro",
    input: 150,
    output: 600,
    cachedInput: null,
    contextLength: 200000,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsAudio: false,
    supportsVideo: false,
    speed: "slow",
    intelligence: 10,
    pricingTier: "high",
    active: false,
    disabled: true,
  },

  {
    id: "openai#o3-pro",
    provider: "openai",
    model: "o3-pro",
    input: 20,
    output: 80,
    cachedInput: null,
    contextLength: 200000,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsAudio: false,
    supportsVideo: false,
    speed: "slow",
    intelligence: 10,
    pricingTier: "high",
    active: false,
    disabled: true,
  },

  {
    id: "openai#o1",
    provider: "openai",
    model: "o1",
    input: 15,
    output: 60,
    cachedInput: 7.5,
    contextLength: 200000,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsAudio: false,
    supportsVideo: false,
    speed: "slow",
    intelligence: 10,
    pricingTier: "high",
    active: false,
    disabled: true,
  },

  {
    id: "openai#o3",
    provider: "openai",
    model: "o3",
    input: 2,
    output: 8,
    cachedInput: 0.5,
    contextLength: 200000,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 9,
    pricingTier: "medium",
    active: false,
    disabled: true,
  },

  {
    id: "openai#o4-mini-high",
    provider: "openai",
    model: "o4-mini-high",
    input: 1.1,
    output: 4.4,
    cachedInput: 0.275,
    contextLength: 200000,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "low",
    active: true,
  },

  {
    id: "openai#o4-mini",
    provider: "openai",
    model: "o4-mini",
    input: 1.1,
    output: 4.4,
    cachedInput: 0.275,
    contextLength: 200000,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  {
    id: "openai#o3-mini-high",
    provider: "openai",
    model: "o3-mini-high",
    input: 1.1,
    output: 4.4,
    cachedInput: 0.55,
    contextLength: 200000,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  {
    id: "openai#o3-mini",
    provider: "openai",
    model: "o3-mini",
    input: 1.1,
    output: 4.4,
    cachedInput: 0.55,
    contextLength: 200000,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  {
    id: "openai#o1-mini",
    provider: "openai",
    model: "o1-mini",
    input: 1.1,
    output: 4.4,
    cachedInput: 0.55,
    contextLength: 128000,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  {
    id: "openai#o1-mini-2024-09-12",
    provider: "openai",
    model: "o1-mini-2024-09-12",
    input: 1.1,
    output: 4.4,
    cachedInput: 0.55,
    contextLength: 128000,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: true,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  {
    id: "openai#codex-mini",
    provider: "openai",
    model: "codex-mini",
    input: 1.5,
    output: 6,
    cachedInput: 0.375,
    contextLength: 200000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 8,
    pricingTier: "medium",
    active: false,
    disabled: true,
  },

  // GPT-4.1 Series
  {
    id: "openai#gpt-4.1",
    provider: "openai",
    model: "gpt-4.1",
    input: 2,
    output: 8,
    cachedInput: 0.5,
    contextLength: 1047576,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4.1-mini",
    provider: "openai",
    model: "gpt-4.1-mini",
    input: 0.4,
    output: 1.6,
    cachedInput: 0.1,
    contextLength: 1047576,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 7,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4.1-nano",
    provider: "openai",
    model: "gpt-4.1-nano",
    input: 0.1,
    output: 0.4,
    cachedInput: 0.025,
    contextLength: 1047576,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 6,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  // GPT-4o Series
  {
    id: "openai#gpt-4o-audio-preview",
    provider: "openai",
    model: "gpt-4o-audio-preview",
    input: 2.5,
    output: 10,
    cachedInput: 1.25,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: true,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4o",
    provider: "openai",
    model: "gpt-4o",
    input: 2.5,
    output: 10,
    cachedInput: 1.25,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4o-2024-11-20",
    provider: "openai",
    model: "gpt-4o-2024-11-20",
    input: 2.5,
    output: 10,
    cachedInput: 1.25,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4o-2024-08-06",
    provider: "openai",
    model: "gpt-4o-2024-08-06",
    input: 2.5,
    output: 10,
    cachedInput: 1.25,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4o-2024-05-13",
    provider: "openai",
    model: "gpt-4o-2024-05-13",
    input: 5,
    output: 15,
    cachedInput: null,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: false,
    disabled: true,
  },

  {
    id: "openai#chatgpt-4o-latest",
    provider: "openai",
    model: "chatgpt-4o-latest",
    input: 5,
    output: 15,
    cachedInput: null,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4o-mini",
    provider: "openai",
    model: "gpt-4o-mini",
    input: 0.15,
    output: 0.6,
    cachedInput: 0.075,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 7,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4o-mini-2024-07-18",
    provider: "openai",
    model: "gpt-4o-mini-2024-07-18",
    input: 0.15,
    output: 0.6,
    cachedInput: 0.075,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 7,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4o-mini-search-preview",
    provider: "openai",
    model: "gpt-4o-mini-search-preview",
    input: 0.15,
    output: 0.6,
    cachedInput: null,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 7,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4o-search-preview",
    provider: "openai",
    model: "gpt-4o-search-preview",
    input: 2.5,
    output: 10,
    cachedInput: null,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "medium",
    active: false,
    disabled: true,
  },

  // GPT-4 Series
  {
    id: "openai#gpt-4-turbo",
    provider: "openai",
    model: "gpt-4-turbo",
    input: 10,
    output: 30,
    cachedInput: null,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "high",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4-turbo-preview",
    provider: "openai",
    model: "gpt-4-turbo-preview",
    input: 10,
    output: 30,
    cachedInput: null,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "high",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4-1106-preview",
    provider: "openai",
    model: "gpt-4-1106-preview",
    input: 10,
    output: 30,
    cachedInput: null,
    contextLength: 128000,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "medium",
    intelligence: 8,
    pricingTier: "high",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4",
    provider: "openai",
    model: "gpt-4",
    input: 30,
    output: 60,
    cachedInput: null,
    contextLength: 8191,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "slow",
    intelligence: 8,
    pricingTier: "high",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-4-0314",
    provider: "openai",
    model: "gpt-4-0314",
    input: 30,
    output: 60,
    cachedInput: null,
    contextLength: 8191,
    supportsTools: true,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "slow",
    intelligence: 8,
    pricingTier: "high",
    active: false,
    disabled: true,
  },

  // GPT-3.5 Series
  {
    id: "openai#gpt-3.5-turbo",
    provider: "openai",
    model: "gpt-3.5-turbo",
    input: 0.5,
    output: 1.5,
    cachedInput: null,
    contextLength: 16385,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 6,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-3.5-turbo-16k",
    provider: "openai",
    model: "gpt-3.5-turbo-16k",
    input: 3,
    output: 4,
    cachedInput: null,
    contextLength: 16385,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 6,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  {
    id: "openai#gpt-3.5-turbo-instruct",
    provider: "openai",
    model: "gpt-3.5-turbo-instruct",
    input: 1.5,
    output: 2,
    cachedInput: null,
    contextLength: 4095,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 6,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  // ============================================================================
  // OpenRouter API
  // ============================================================================
  // generated models from scripts/transform-openrouter-models.ts
  ...OPENROUTER_MODELS,

  // ============================================================================
  // Groq API
  // ============================================================================

  {
    id: "groq#openai/gpt-oss-20b",
    provider: "groq",
    model: "openrouter#openai/gpt-oss-20b",
    input: 0.5,
    output: 0.8,
    cachedInput: 0.1,
    contextLength: 131072,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 7,
    pricingTier: "low",
    active: false,
    disabled: true,
  },

  {
    id: "groq#openai/gpt-oss-120b",
    provider: "groq",
    model: "openrouter#openai/gpt-oss-120b",
    input: 0.15,
    output: 0.75,
    cachedInput: 0.015,
    contextLength: 131072,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: false,
    supportsReasoning: false,
    supportsAudio: false,
    supportsVideo: false,
    speed: "fast",
    intelligence: 9,
    pricingTier: "low",
    active: false,
    disabled: true,
  },
]

// Normalize legacy keys to clear naming on export
export const MODEL_CATALOG: ModelEntry[] = RAW_MODEL_CATALOG.map((m: any) => {
  const { active, disabled, ...rest } = m
  return {
    ...rest,
    runtimeEnabled: active ?? true,
    uiHiddenInProd: !!disabled,
  } as ModelEntry
})

/**
 * Helper: Get all active models
 * In development mode, returns ALL models (ignores active flag)
 */
/**
 * Returns models eligible for runtime selection.
 * In development, returns all models (ignores the flag to ease testing).
 */
export function getRuntimeEnabledModels(): ModelEntry[] {
  const isDevelopment = process.env.NODE_ENV === "development"
  return isDevelopment ? MODEL_CATALOG : MODEL_CATALOG.filter(m => m.runtimeEnabled)
}

/**
 * @deprecated Use getRuntimeEnabledModels() instead.
 */
export function getActiveModels(): ModelEntry[] {
  return getRuntimeEnabledModels()
}

/**
 * Helper: Get models by provider
 */
export function getModelsByProvider(provider: string): ModelEntry[] {
  const validatedProvider = providerNameSchema.parse(provider)
  if (!validatedProvider) {
    throw new Error("Invalid provider")
  }
  return MODEL_CATALOG.filter(m => m.provider === validatedProvider)
}

/**
 * Helper: Get all unique providers from the catalog
 * @throws {Error} If MODEL_CATALOG contains no providers
 */
export function getAllProviders(): string[] {
  if (MODEL_CATALOG.length === 0) {
    throw new Error("MODEL_CATALOG contains no models")
  }

  const providers = new Set<string>()
  for (const model of MODEL_CATALOG) {
    providers.add(model.provider)
  }

  const result = Array.from(providers).sort()

  if (result.length === 0) {
    throw new Error("MODEL_CATALOG contains no valid providers")
  }

  return result
}

/**
 * Helper: Get all providers that have at least one active model
 * In development mode, returns ALL providers (ignores active flag)
 */
/**
 * Returns providers that have at least one runtime-enabled model.
 * In development, returns all providers.
 */
export function getRuntimeEnabledProviders(): string[] {
  const isDevelopment = process.env.NODE_ENV === "development"
  const providers = new Set<string>()
  for (const model of MODEL_CATALOG) {
    if (isDevelopment || model.runtimeEnabled) providers.add(model.provider)
  }
  return Array.from(providers).sort()
}

/**
 * @deprecated Use getRuntimeEnabledProviders() instead.
 */
export function getActiveProviders(): string[] {
  return getRuntimeEnabledProviders()
}

/**
 * Helper: Get provider configuration with model counts
 */
export interface ProviderInfo {
  name: string
  totalModels: number
  activeModels: number
  models: ModelEntry[]
}

export function getProviderInfo(): ProviderInfo[] {
  const providerMap = new Map<string, ModelEntry[]>()

  // Group models by provider
  for (const model of MODEL_CATALOG) {
    if (!providerMap.has(model.provider)) {
      providerMap.set(model.provider, [])
    }
    providerMap.get(model.provider)!.push(model)
  }

  // Build provider info
  return Array.from(providerMap.entries())
    .map(([name, models]) => ({
      name,
      totalModels: models.length,
      activeModels: models.filter(m => m.runtimeEnabled).length,
      models,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Helper: Get catalog statistics
 */
export function getCatalogStats() {
  const isDevelopment = process.env.NODE_ENV === "development"
  const active = getRuntimeEnabledModels()
  const providers = getAllProviders()
  const byProvider: Record<string, number> = {}

  for (const provider of providers) {
    const providerModels = getModelsByProvider(provider)
    byProvider[provider] = isDevelopment ? providerModels.length : providerModels.filter(m => m.runtimeEnabled).length
  }

  return {
    total: MODEL_CATALOG.length,
    active: active.length,
    byProvider,
    byPricingTier: {
      low: active.filter(m => m.pricingTier === "low").length,
      medium: active.filter(m => m.pricingTier === "medium").length,
      high: active.filter(m => m.pricingTier === "high").length,
    },
  }
}

/**
 * Helper: Validate catalog integrity
 * Checks for common issues like non-lowercase providers, invalid ID formats, etc.
 */
export function validateCatalogIntegrity(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (MODEL_CATALOG.length === 0) {
    errors.push("MODEL_CATALOG is empty")
    return { valid: false, errors }
  }

  for (const model of MODEL_CATALOG) {
    // Check required fields first to avoid null/undefined errors in subsequent checks
    if (!model.provider || !model.model || !model.id) {
      errors.push(`Model ${model.id || "unknown"} is missing required fields`)
      continue // Skip other checks if required fields are missing
    }

    // Check provider is lowercase
    if (model.provider !== model.provider.toLowerCase()) {
      errors.push(`Model ${model.id} has non-lowercase provider: ${model.provider}`)
    }

    // Check ID format follows provider#model pattern
    if (!model.id.includes("#")) {
      errors.push(`Model ${model.id} has invalid ID format (must be "<provider>#<model>")`)
    }

    // Check pricing values are valid
    if (model.input < 0 || model.output < 0) {
      errors.push(`Model ${model.id} has negative pricing values`)
    }

    // Check context length is positive
    if (model.contextLength <= 0) {
      errors.push(`Model ${model.id} has invalid context length: ${model.contextLength}`)
    }
  }

  return { valid: errors.length === 0, errors }
}
