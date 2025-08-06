import type { StandardModels, AllowedModelName } from "@core/utils/spending/models.types"
import type { LuckyProvider } from "@core/utils/spending/provider"
import { MODEL_CONFIG } from "@runtime/settings/models"

export const DEFAULT_MODELS = {
  openrouter: {
    summary: "google/gemini-2.5-flash-lite",
    nano: "google/gemini-2.5-flash-lite",
    low: "google/gemini-2.5-flash-lite",
    medium: "google/gemini-2.5-pro-preview",
    high: "google/gemini-2.5-pro-preview",
    default: "google/gemini-2.5-flash-lite",
    fitness: "google/gemini-2.5-pro-preview",
    reasoning: "anthropic/claude-sonnet-4",
    fallback: "switchpoint/router",
  },
  groq: {
    summary: "llama-3.1-70b-versatile",
    nano: "llama-3.1-70b-versatile",
    low: "llama-3.1-70b-versatile",
    medium: "llama-3.1-70b-versatile",
    high: "llama-3.1-70b-versatile",
    default: "llama-3.1-70b-versatile",
    fitness: "llama-3.1-70b-versatile",
    reasoning: "llama-3.1-70b-versatile",
    fallback: "llama-3.1-70b-versatile",
  },
  openai: {
    summary: "gpt-4.1-nano",
    nano: "gpt-4.1-mini",
    low: "gpt-4.1-mini",
    medium: "gpt-4.1-mini",
    high: "gpt-4.1-mini",
    default: "gpt-4.1-mini",
    fitness: "gpt-4.1-mini",
    reasoning: "gpt-4.1-mini",
    fallback: "gpt-4.1-mini",
  },
} satisfies {
  [T in LuckyProvider]: StandardModels<T, "any">
}

export const getDefaultModels = (): StandardModels<LuckyProvider, "any"> => {
  const provider = MODEL_CONFIG.provider
  return DEFAULT_MODELS[provider] as StandardModels<LuckyProvider, "any">
}
