import type { PricingLevel } from "@core/messages/api/vercel/pricing/calculatePricing"
import { getActiveModelNames, getModelV2 } from "@core/utils/spending/functions"
import type { ModelName } from "@core/utils/spending/models.types"

// model utilities - use new providersV2 system
const getActiveModels = (): ReadonlyArray<string> => {
  return getActiveModelNames()
}

const getActiveModelsWithInfo = (): string => {
  return getActiveModels()
    .map(model => `modelName:${model},metadata:${getModelV2(model)?.info}`)
    .join(";")
}

export const ACTIVE_MODEL_NAMES = getActiveModels() as [string, ...string[]]
export const ACTIVE_MODEL_NAMES_WITH_INFO = getActiveModelsWithInfo()

export const openaiModelsByLevel: Record<PricingLevel, ModelName> = {
  low: "gpt-4.1-nano" as ModelName,
  medium: "gpt-4.1-mini" as ModelName,
  high: "gpt-4.1" as ModelName,
}

/**
 * @deprecated Use pricingV2 and ModelName
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
    console.log(`getPricingLevel: No pricing match found in info for model ${model}: ${info}`)
    return "medium"
  }
  return match[1] as PricingLevel
}
