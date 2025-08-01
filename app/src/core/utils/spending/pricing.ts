import { CONFIG } from "@/runtime/settings/constants"
import { pricing, type ModelName } from "@/runtime/settings/models"

// model utilities
const getActiveModels = (): ReadonlyArray<ModelName> => {
  const ALL_MODELS = Object.keys(pricing) as ModelName[]
  if (CONFIG.models.inactive.size === 0) return ALL_MODELS

  return ALL_MODELS.filter((model) => !CONFIG.models.inactive.has(model))
}

const getActiveModelsWithInfo = (): string => {
  return getActiveModels()
    .map((model) => `modelName:${model},metadata:${pricing[model].info}`)
    .join(";")
}

export const ACTIVE_MODEL_NAMES = getActiveModels() as [
  ModelName,
  ...ModelName[],
]
export const ACTIVE_MODEL_NAMES_WITH_INFO = getActiveModelsWithInfo()

type PricingLevel = "low" | "medium" | "high"

export const openaiModelsByLevel: Record<PricingLevel, ModelName> = {
  low: "openai/gpt-4.1-nano" as any,
  medium: "openai/gpt-4.1-mini" as any,
  high: "openai/gpt-4.1" as any,
}

export function getPricingLevel(model: ModelName): PricingLevel {
  const info = pricing[model]?.info
  if (!info) {
    console.log(`getPricingLevel: No info found for model ${model}`)
    return "medium"
  }
  const match = info.match(/pricing:(\w+);/)
  if (!match) {
    console.log(
      `getPricingLevel: No pricing match found in info for model ${model}: ${info}`
    )
    return "medium"
  }
  return match[1] as PricingLevel
}
