/**
 * Model type definitions and pricing data
 * Pure types and constants without runtime dependencies
 */

// Provider types
export type LuckyProvider = "openai" | "openrouter" | "groq"

/* ---------- PRICING TYPES ---------- */
export type ModelPricingV2 = {
  id: string
  input: number
  "cached-input": number | null
  output: number
  info: `IQ:${number}/10;speed:${"fast" | "medium" | "slow"};pricing:${"low" | "medium" | "high"};`
  context_length: number
  active: boolean
} // per 1M tokens

/* ───────── TYPE-SAFE MODEL SELECTION ───────── */

// Keep only "active: true" model keys as strings
export type ActiveKeys<T extends Record<string, { active: boolean }>> = Extract<
  {
    [K in keyof T]: T[K]["active"] extends true ? K : never
  }[keyof T],
  string
>

export type AnyModelName = {
  [P in LuckyProvider]: keyof (typeof providersV2)[P]
}[LuckyProvider]

type ModelNameV2<T extends LuckyProvider = LuckyProvider> = {
  [P in LuckyProvider]: keyof (typeof providersV2)[P]
}[T]

// Only allow ACTIVE models from a specific provider (for runtime validation)
export type AllowedModelName<T extends LuckyProvider = LuckyProvider> = ActiveKeys<(typeof providersV2)[T]>

// ModelName now accepts any model from any provider - validation happens at runtime
export type ModelName = AnyModelName

export type OpenRouterModelName = AllowedModelName<"openrouter">

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cachedInputTokens?: number
}

// open or closed for other providers, depending on the provider
export type StandardModels<T extends LuckyProvider = LuckyProvider, M extends "any" | "onlyActive" = "any"> = {
  summary: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  nano: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  low: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  medium: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  high: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  default: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  fitness: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  reasoning: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
  fallback: M extends "any" ? ModelNameV2<T> : AllowedModelName<T>
}

export interface ModelPool {
  standardModels: StandardModels

  //active models, including their info
  activeModels: Record<LuckyProvider, Record<string, ModelPricingV2>>

  provider: LuckyProvider
}

// Create type-safe active model subset - ActiveModelName should be assignable to ModelName
export type ActiveModelName = AllowedModelName

/* ───────── MODEL PRICING DATA ───────── */

export const providersV2 = {
  // Direct OpenAI API
  openai: {
    "gpt-4.1-nano": {
      id: "openai/gpt-4.1-nano",
      input: 0.1,
      "cached-input": 0.025,
      output: 0.4,
      info: "IQ:6/10;speed:fast;pricing:low;",
      context_length: 1047576,
      active: true,
    },
    "gpt-4.1-mini": {
      id: "openai/gpt-4.1-mini",
      input: 0.4,
      "cached-input": 0.1,
      output: 1.6,
      info: "IQ:7/10;speed:fast;pricing:medium;",
      context_length: 1047576,
      active: true,
    },
    "gpt-4o-mini": {
      id: "openai/gpt-4o-mini",
      input: 0.15,
      "cached-input": 0.075,
      output: 0.6,
      info: "IQ:7/10;speed:fast;pricing:low;",
      context_length: 128000,
      active: true,
    },
    "gpt-3.5-turbo": {
      id: "openai/gpt-3.5-turbo",
      input: 0.5,
      "cached-input": null,
      output: 1.5,
      info: "IQ:6/10;speed:fast;pricing:low;",
      context_length: 16385,
      active: true,
    },
    "gpt-4": {
      id: "openai/gpt-4",
      input: 30,
      "cached-input": null,
      output: 60,
      info: "IQ:8/10;speed:slow;pricing:high;",
      context_length: 8192,
      active: true,
    },
    "gpt-4-turbo": {
      id: "openai/gpt-4-turbo",
      input: 10,
      "cached-input": null,
      output: 30,
      info: "IQ:8/10;speed:medium;pricing:high;",
      context_length: 128000,
      active: true,
    },
    "gpt-4o": {
      id: "openai/gpt-4o",
      input: 2.5,
      "cached-input": 1.25,
      output: 10,
      info: "IQ:8/10;speed:medium;pricing:medium;",
      context_length: 128000,
      active: true,
    },
    "gpt-4o-search-preview": {
      id: "openai/gpt-4o-search-preview",
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
      id: "google/gemini-2.5-flash-lite",
      input: 0.15,
      "cached-input": 0.06,
      output: 0.6,
      info: "IQ:5/10;speed:fast;pricing:low;",
      context_length: 1048576,
      active: true,
    },
    "google/gemini-2.5-pro-preview": {
      id: "google/gemini-2.5-pro-preview",
      input: 1.25,
      "cached-input": 0.416667,
      output: 10,
      info: "IQ:7/10;speed:medium;pricing:medium;",
      context_length: 1048576,
      active: false,
    },
    "anthropic/claude-sonnet-4": {
      id: "anthropic/claude-sonnet-4",
      input: 3,
      "cached-input": 1.166667,
      output: 15,
      info: "IQ:8/10;speed:medium;pricing:medium;",
      context_length: 1047576,
      active: true,
    },
    "switchpoint/router": {
      id: "switchpoint/router",
      input: 0.85,
      "cached-input": 0.283333,
      output: 3.4,
      context_length: 131072,
      info: "IQ:8/10;speed:medium;pricing:medium;",
      active: true,
    },
    "openai/gpt-4.1": {
      id: "openai/gpt-4.1",
      input: 12,
      "cached-input": 4,
      output: 48,
      info: "IQ:8/10;speed:medium;pricing:medium;",
      context_length: 128000,
      active: true,
    },
    "openai/gpt-4.1-mini": {
      id: "openai/gpt-4.1-mini",
      input: 0.4,
      "cached-input": 0.1,
      output: 1.6,
      info: "IQ:7/10;speed:fast;pricing:medium;",
      context_length: 128000,
      active: true,
    },
    "openai/gpt-4.1-nano": {
      id: "openai/gpt-4.1-nano",
      input: 0.15,
      "cached-input": 0.06,
      output: 0.6,
      info: "IQ:8/10;speed:medium;pricing:medium;",
      context_length: 128000,
      active: true,
    },
    "openai/gpt-4o-mini": {
      id: "openai/gpt-4o-mini",
      input: 0.15,
      "cached-input": 0.075,
      output: 0.6,
      info: "IQ:7/10;speed:fast;pricing:low;",
      context_length: 128000,
      active: true,
    },
    "openai/gpt-3.5-turbo": {
      id: "openai/gpt-3.5-turbo",
      input: 0.5,
      "cached-input": 0.025,
      output: 0.4,
      info: "IQ:6/10;speed:fast;pricing:low;",
      context_length: 16385,
      active: true,
    },
    "openai/gpt-4o": {
      id: "openai/gpt-4o",
      input: 2.5,
      "cached-input": 1.25,
      output: 10,
      info: "IQ:8/10;speed:medium;pricing:medium;",
      context_length: 128000,
      active: true,
    },
    "anthropic/claude-3-5-haiku": {
      id: "anthropic/claude-3-5-haiku",
      input: 0.25,
      "cached-input": 0.125,
      output: 1.25,
      info: "IQ:7/10;speed:fast;pricing:low;",
      context_length: 200000,
      active: true,
    },
    "meta-llama/llama-3.1-8b-instruct": {
      id: "meta-llama/llama-3.1-8b-instruct",
      input: 0.055,
      "cached-input": null,
      output: 0.055,
      info: "IQ:6/10;speed:fast;pricing:low;",
      context_length: 131072,
      active: true,
    },
    "moonshotai/kimi-k2": {
      id: "moonshotai/kimi-k2",
      input: 0.5,
      "cached-input": 0.1,
      output: 1.5,
      info: "IQ:6/10;speed:medium;pricing:medium;",
      context_length: 128000,
      active: false,
    },
    "moonshotai/kimi-k2-instruct": {
      id: "moonshotai/kimi-k2-instruct",
      input: 0.5,
      "cached-input": 0.1,
      output: 1.5,
      info: "IQ:6/10;speed:medium;pricing:medium;",
      context_length: 128000,
      active: false,
    },
    "x-ai/grok-4": {
      id: "x-ai/grok-4",
      input: 2.0,
      "cached-input": 0.5,
      output: 8.0,
      info: "IQ:7/10;speed:medium;pricing:high;",
      context_length: 131072,
      active: false,
    },
    "mistralai/mistral-small-3.2-24b-instruct": {
      id: "mistralai/mistral-small-3.2-24b-instruct",
      input: 0.055,
      "cached-input": 0.018333,
      output: 0.055,
      info: "IQ:6/10;speed:fast;pricing:low;",
      context_length: 131072,
      active: true,
    },
    "openai/gpt-5": {
      id: "openai/gpt-5",
      input: 1.25,
      "cached-input": 0.4,
      output: 10,
      info: "IQ:9/10;speed:medium;pricing:medium;",
      context_length: 128000,
      active: true,
    },
  },
  // Groq API
  groq: {
    "openai/gpt-oss-20b": {
      id: "openai/gpt-oss-20b",
      input: 0.5,
      "cached-input": 0.1,
      output: 0.8,
      info: "IQ:7/10;speed:fast;pricing:low;",
      context_length: 131072,
      active: true,
    },
    "openai/gpt-oss-120b": {
      id: "openai/gpt-oss-120b",
      input: 0.15,
      "cached-input": 0.015,
      output: 0.75,
      info: "IQ:9/10;speed:fast;pricing:low;",
      context_length: 131072,
      active: true,
    },
  },
} as const satisfies Record<LuckyProvider, Record<string, ModelPricingV2>>

/**
 * Get all active models from a specific provider (pure function, no runtime deps)
 * @param provider - The provider to get active models from
 * @returns Array of active model names
 */
export function getActiveModelNamesFromProvider(provider: LuckyProvider): string[] {
  const models = providersV2[provider]
  return Object.entries(models)
    .filter(([_, modelData]) => modelData.active)
    .map(([modelName]) => modelName)
}

/**
 * Get all active models across all providers (pure function)
 * @returns Array of all active model names
 */
export function getAllActiveModelNames(): string[] {
  const providers: LuckyProvider[] = ["openai", "openrouter", "groq"]
  return providers.flatMap(provider => getActiveModelNamesFromProvider(provider))
}

/**
 * Pure computed constant: All active model names from providersV2
 * Note: This is computed at module load time and doesn't consider runtime config
 */
export const ACTIVE_MODEL_NAMES_PURE = getAllActiveModelNames() as string[]

/**
 * Get active models with their metadata info
 */
export function getActiveModelsWithInfo(): string {
  const results: string[] = []
  for (const provider of Object.keys(providersV2) as LuckyProvider[]) {
    const models = providersV2[provider]
    for (const [modelName, modelData] of Object.entries(models)) {
      if (modelData.active) {
        results.push(`modelName:${modelName},metadata:${modelData.info}`)
      }
    }
  }
  return results.join(";")
}

export const ACTIVE_MODEL_NAMES_WITH_INFO_PURE = getActiveModelsWithInfo()
