import { DEFAULT_MODELS } from "@lucky/models"
import { getActiveModelsByGateway } from "@lucky/models/llm-catalog/catalog-queries"
import type { LuckyGateway, StandardModels } from "@lucky/shared"

// model runtime configuration
export const MODEL_CONFIG = {
  gateway: "openrouter-api" as const satisfies LuckyGateway,
  inactive: ["moonshotai/kimi-k2", "x-ai/grok-4", "qwen/qwq-32b:free"] as string[],
  defaults: DEFAULT_MODELS["openrouter-api"],
} as const

export const getDefaultModels = (): StandardModels => {
  const gateway = MODEL_CONFIG.gateway
  return DEFAULT_MODELS[gateway]
}

/**
 * Returns the cheapest active model id for the current provider, preferring
 * the lowest input-token price. Falls back to the configured summary model.
 */
export const getCheapestActiveModelId = (): string => {
  const gateway = MODEL_CONFIG.gateway
  const models = getActiveModelsByGateway(gateway)
  return models.sort((a, b) => a.input - b.input)[0]?.gatewayModelId ?? DEFAULT_MODELS[gateway].summary
}
