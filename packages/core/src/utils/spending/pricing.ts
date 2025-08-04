import {
  isActiveModel,
  MODEL_CONFIG,
  pricing,
  type ActiveModelName,
  type ModelName,
} from "@/utils/models/models"

// Get active models from new provider structure
const getActiveModels = (): ReadonlyArray<ActiveModelName> => {
  return MODEL_CONFIG.activeModels.filter(isActiveModel) as ActiveModelName[]
}

const getActiveModelsWithInfo = (): string => {
  return getActiveModels()
    .map((model) => `modelName:${model},metadata:${pricing[model].info}`)
    .join(";")
}

// Type-safe active model names array
export const ACTIVE_MODEL_NAMES = getActiveModels() as [
  ActiveModelName,
  ...ActiveModelName[],
]
export const ACTIVE_MODEL_NAMES_WITH_INFO = getActiveModelsWithInfo()

type PricingLevel = "low" | "medium" | "high"

export const openaiModelsByLevel: Record<PricingLevel, ActiveModelName> = {
  low: "openai/gpt-4.1-nano" as ActiveModelName,
  medium: "openai/gpt-4.1-mini" as ActiveModelName,
  high: "openai/gpt-4o-search-preview" as ActiveModelName,
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
