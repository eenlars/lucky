import { getModelV2 } from "@core/utils/spending/functions"
import type { PricingLevel } from "@core/utils/spending/vercel/calculatePricing"
import { CONFIG } from "@runtime/settings/constants"
import { pricingOLD, type ModelName } from "@runtime/settings/models"

// model utilities
const getActiveModels = (): ReadonlyArray<ModelName> => {
  const ALL_MODELS = Object.keys(pricingOLD) as ModelName[]
  if (CONFIG.models.inactive.size === 0) return ALL_MODELS

  return ALL_MODELS.filter((model) => !CONFIG.models.inactive.has(model))
}

const getActiveModelsWithInfo = (): string => {
  return getActiveModels()
    .map((model) => `modelName:${model},metadata:${getModelV2(model)?.info}`)
    .join(";")
}

export const ACTIVE_MODEL_NAMES = getActiveModels() as [
  ModelName,
  ...ModelName[],
]
export const ACTIVE_MODEL_NAMES_WITH_INFO = getActiveModelsWithInfo()

export const openaiModelsByLevel: Record<PricingLevel, ModelName> = {
  low: "gpt-4.1-nano" as ModelName,
  medium: "gpt-4.1-mini" as ModelName,
  high: "gpt-4.1" as ModelName,
}

/**
 * @deprecated Use pricingV2 and ModelNameV2 instead of pricingOLD and ModelName
 * This will be removed in a future version
 */
export function getPricingLevel(model: ModelName): PricingLevel {
  const info = getModelV2(model)?.info
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
