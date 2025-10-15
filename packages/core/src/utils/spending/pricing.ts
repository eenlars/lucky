import type { PricingLevel } from "@core/messages/api/vercel/pricing/calculatePricing"
import { getActiveModelNames } from "@core/utils/spending/functions"
import { findModel } from "@lucky/models"

// model utilities - use new providersV2 system
const getActiveModels = (): ReadonlyArray<string> => {
  return getActiveModelNames()
}

const getActiveModelsWithInfo = (): string => {
  return getActiveModels()
    .map(model => `modelName:${model},metadata:${findModel(model)}`)
    .join(";")
}

export const ACTIVE_MODEL_NAMES = getActiveModels() as [string, ...string[]]
export const ACTIVE_MODEL_NAMES_WITH_INFO = getActiveModelsWithInfo()

export const openaiModelsByLevel: Record<PricingLevel, string> = {
  low: "gpt-5-nano" as string,
  medium: "gpt-5-mini" as string,
  high: "gpt-5" as string,
}
