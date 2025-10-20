import { DEFAULT_MODELS, getActiveModelsByProvider } from "@lucky/models"
import type { LuckyProvider, StandardModels } from "@lucky/shared"

// model runtime configuration
export const MODEL_CONFIG = {
  provider: "openrouter" as const satisfies LuckyProvider,
  inactive: ["moonshotai/kimi-k2", "x-ai/grok-4", "qwen/qwq-32b:free"] as string[],
  defaults: DEFAULT_MODELS.openrouter,
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
