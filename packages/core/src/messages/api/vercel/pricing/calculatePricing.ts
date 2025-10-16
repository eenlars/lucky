import { findModel } from "@lucky/models"
import type { TokenUsage } from "@lucky/shared"

/**
 * Minimal usage stats available from Vercel SDK responses.
 */
export interface VercelUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}
export type PricingLevel = "low" | "medium" | "high"

/**
 * Calculate the USD cost breakdown for input, output, and total tokens.
 * @param model - The model name
 * @param usage - The token usage
 * @returns The cost breakdown
 */
export function calculateCostV2(model: string, usage: TokenUsage): number {
  const modelPricing = findModel(model)
  if (!modelPricing) {
    console.warn(`No pricing found for model: ${model}`)
    return 0
  }

  let cost = 0

  // Calculate input token cost
  const nonCachedInput = usage.inputTokens - (usage.cachedInputTokens || 0)
  cost += (nonCachedInput / 1_000_000) * modelPricing.input

  // Calculate cached input token cost if applicable
  if (usage.cachedInputTokens && modelPricing.cachedInput) {
    cost += (usage.cachedInputTokens / 1_000_000) * modelPricing.cachedInput
  }

  // Calculate output token cost
  cost += (usage.outputTokens / 1_000_000) * modelPricing.output

  return cost
}

export function getPricingLevelV2(model: string): PricingLevel {
  const modelConfig = findModel(model)
  if (!modelConfig) {
    console.warn(`No pricing found for model: ${model}`)
    return "medium"
  }

  const inputPrice = modelConfig.input

  const ranges = {
    low: 0.5,
    medium: 1,
    high: 2,
  }

  if (inputPrice < ranges.low) {
    return "low"
  }
  if (inputPrice < ranges.medium) {
    return "medium"
  }

  return "high"
}
