import type { PricingLevel } from "@core/messages/api/vercel/pricing/calculatePricing"
import { getActiveModelNames, getModelV2 } from "@core/utils/spending/functions"
import type {
  ActiveModelName,
  ModelNameV2,
} from "@core/utils/spending/models.types"

// model utilities - use new providersV2 system
const getActiveModels = (): ReadonlyArray<ActiveModelName> => {
  return getActiveModelNames()
}

const getActiveModelsWithInfo = (): string => {
  return getActiveModels()
    .map((model) => `modelName:${model},metadata:${getModelV2(model)?.info}`)
    .join(";")
}

export const ACTIVE_MODEL_NAMES = getActiveModels() as [
  ActiveModelName,
  ...ActiveModelName[],
]
export const ACTIVE_MODEL_NAMES_WITH_INFO = getActiveModelsWithInfo()

export const openaiModelsByLevel: Record<PricingLevel, ModelNameV2> = {
  low: "gpt-4.1-nano" as ModelNameV2,
  medium: "gpt-4.1-mini" as ModelNameV2,
  high: "gpt-4.1" as ModelNameV2,
}

/**
 * @deprecated Use pricingV2 and ModelNameV2 instead of pricingOLD and ModelName
 * This will be removed in a future version
 */
export function getPricingLevel(model: ModelNameV2): PricingLevel {
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
