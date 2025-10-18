import { getActiveModelsByProvider } from "@lucky/models"
import type { LuckyProvider, StandardModels } from "@lucky/shared"

/* ---------- DEFAULT MODELS ---------- */
export const DEFAULT_MODELS: Record<LuckyProvider, StandardModels> = {
  openrouter: {
    summary: "openrouter#google/gemini-2.5-flash-lite",
    nano: "openrouter#google/gemini-2.5-flash-lite",
    low: "openrouter#google/gemini-2.5-flash-lite",
    balanced: "openrouter#openai/gpt-4.1-mini",
    high: "openrouter#openai/gpt-4.1",
    default: "openrouter#openai/gpt-4.1-nano",
    fitness: "openrouter#openai/gpt-4.1-mini",
    reasoning: "openrouter#openai/gpt-4.1-mini",
    fallback: "switchpoint/router",
  },
  groq: {
    summary: "groq#openai/gpt-oss-20b",
    nano: "groq#openai/gpt-oss-20b",
    low: "groq#openai/gpt-oss-20b",
    balanced: "groq#openai/gpt-oss-20b",
    high: "groq#openai/gpt-oss-20b",
    default: "groq#openai/gpt-oss-20b",
    fitness: "groq#openai/gpt-oss-20b",
    reasoning: "groq#openai/gpt-oss-20b",
    fallback: "groq#openai/gpt-oss-20b",
  },
  openai: {
    summary: "openai#gpt-5-nano",
    nano: "openai#gpt-5-nano",
    low: "openai#gpt-5-nano",
    balanced: "openai#gpt-5-nano",
    high: "openai#gpt-5-nano",
    default: "openai#gpt-5-nano",
    fitness: "openai#gpt-5-nano",
    reasoning: "openai#gpt-5-nano",
    fallback: "openai#gpt-5-nano",
  },
}

// model runtime configuration
export const MODEL_CONFIG = {
  provider: "openai" as const satisfies LuckyProvider,
  inactive: ["moonshotai/kimi-k2", "x-ai/grok-4", "qwen/qwq-32b:free"] as string[],
  defaults: DEFAULT_MODELS.openai,
} as const

export const getDefaultModels = (): StandardModels => {
  const provider = MODEL_CONFIG.provider
  return DEFAULT_MODELS[provider]
}

/**
 * Returns the cheapest active model id for the current provider, preferring
 * the lowest input-token price. Falls back to the configured summary model.
 */
export const getCheapestActiveModelId = (): string => {
  const provider = MODEL_CONFIG.provider
  const models = getActiveModelsByProvider(provider)
  return models.sort((a, b) => a.input - b.input)[0]?.model ?? DEFAULT_MODELS[provider].summary
}
