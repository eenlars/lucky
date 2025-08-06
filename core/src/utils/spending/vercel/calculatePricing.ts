import { getModelV2 } from "@core/utils/spending/functions"
import { providersV2 } from "@core/utils/spending/modelInfo"
import type { ModelNameV2, TokenUsage } from "@core/utils/spending/models.types"
import { CURRENT_PROVIDER } from "@core/utils/spending/provider"
import { guard } from "@core/workflow/schema/errorMessages"
import { pricingOLD, type ModelName } from "@runtime/settings/models"

export type VercelUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}
export type PricingLevel = "low" | "medium" | "high"

/**
 * @deprecated Use calculateCostV2 instead
 */
export function calculateCost(model: string, usage: TokenUsage): number {
  const modelPricing = pricingOLD[model as ModelName]
  if (!modelPricing) {
    console.warn(`No pricing found for model: ${model}`)
    return 0
  }

  let cost = 0

  // Calculate input token cost
  const nonCachedInput = usage.inputTokens - (usage.cachedInputTokens || 0)
  cost += (nonCachedInput / 1_000_000) * modelPricing.input

  // Calculate cached input token cost if applicable
  if (usage.cachedInputTokens && modelPricing["cached-input"]) {
    cost += (usage.cachedInputTokens / 1_000_000) * modelPricing["cached-input"]
  }

  // Calculate output token cost
  cost += (usage.outputTokens / 1_000_000) * modelPricing.output

  return cost
}

/**
 * Calculate the USD cost breakdown for input, output, and total tokens.
 * @param model - The model name
 * @param usage - The token usage
 * @returns The cost breakdown
 */
export function calculateCostV2(model: string, usage: TokenUsage): number {
  const modelPricing = getModelV2(model)
  if (!modelPricing) {
    console.warn(`No pricing found for model: ${model}`)
    return 0
  }

  let cost = 0

  // Calculate input token cost
  const nonCachedInput = usage.inputTokens - (usage.cachedInputTokens || 0)
  cost += (nonCachedInput / 1_000_000) * modelPricing.input

  // Calculate cached input token cost if applicable
  if (usage.cachedInputTokens && modelPricing["cached-input"]) {
    cost += (usage.cachedInputTokens / 1_000_000) * modelPricing["cached-input"]
  }

  // Calculate output token cost
  cost += (usage.outputTokens / 1_000_000) * modelPricing.output

  return cost
}

export function getPricingLevelV2(model: ModelNameV2): PricingLevel {
  const inputPrice = providersV2[CURRENT_PROVIDER][model].input

  guard(inputPrice, `getPricingLevelV2: No input price for model ${model}`)

  const ranges = {
    low: 0.5,
    medium: 1,
    high: 2,
  }

  if (inputPrice < ranges.low) {
    return "low"
  } else if (inputPrice < ranges.medium) {
    return "medium"
  }

  return "high"
}
