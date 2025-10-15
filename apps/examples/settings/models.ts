import { getActiveModelsByProvider } from "@lucky/models"
import type { LuckyProvider, StandardModels } from "@lucky/shared"

/* ---------- DEFAULT MODELS ---------- */
export const DEFAULT_MODELS: Record<LuckyProvider, StandardModels> = {
  openrouter: {
    summary: "google/gemini-2.5-flash-lite",
    nano: "google/gemini-2.5-flash-lite",
    low: "google/gemini-2.5-flash-lite",
    medium: "openai/gpt-4.1-mini",
    high: "openai/gpt-4.1",
    default: "openai/gpt-4.1-nano",
    fitness: "openai/gpt-4.1-mini",
    reasoning: "openai/gpt-4.1-mini",
    fallback: "switchpoint/router",
  },
  groq: {
    summary: "openai/gpt-oss-20b",
    nano: "openai/gpt-oss-20b",
    low: "openai/gpt-oss-20b",
    medium: "openai/gpt-oss-20b",
    high: "openai/gpt-oss-20b",
    default: "openai/gpt-oss-20b",
    fitness: "openai/gpt-oss-20b",
    reasoning: "openai/gpt-oss-20b",
    fallback: "openai/gpt-oss-20b",
  },
  openai: {
    summary: "gpt-5-nano",
    nano: "gpt-5-nano",
    low: "gpt-5-mini",
    medium: "gpt-5",
    high: "gpt-5",
    default: "gpt-5-nano",
    fitness: "gpt-5-mini",
    reasoning: "gpt-5",
    fallback: "gpt-5-mini",
  },
}

// model runtime configuration
export const MODEL_CONFIG = {
  provider: "openai" as const satisfies LuckyProvider,
  inactive: [
    "moonshotai/kimi-k2",
    // "deepseek/deepseek-r1-0528:free", // timeouts
    // "anthropic/claude-sonnet-4",
    "x-ai/grok-4",
    "qwen/qwq-32b:free",
    // "moonshotai/kimi-k2-instruct",
    // "google/gemini-2.5-pro-preview",
    // "openai/gpt-4.1",
    // "openai/gpt-4.1-mini",
  ] as string[],
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
