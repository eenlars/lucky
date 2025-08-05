import { isNir } from "@core/utils/common/isNir"
import type { TokenUsage } from "@runtime/settings/models"
import { pricing, type ModelName } from "@runtime/settings/models"

export type VercelUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type TokenCostBreakdown = {
  input: number
  output: number
  total: number
}

/**
 * Calculate the USD cost breakdown for input, output, and total tokens.
 */
export function calculateTokenCost(
  usage: Partial<VercelUsage> = {},
  modelName: ModelName
): TokenCostBreakdown {
  if (usage === null || usage === undefined || isNir(modelName)) {
    console.error(
      `Invalid usage or model name: ${JSON.stringify(usage)} ${JSON.stringify(modelName)}`
    )
    return { input: 0, output: 0, total: 0 }
  }
  const { promptTokens = 0, completionTokens = 0 } = usage

  const modelPricing = pricing[modelName]
  if (!modelPricing) {
    console.error(`Model pricing not found for: ${modelName}`)
    return { input: 0, output: 0, total: 0 }
  }
  const { input: pricePerMInput, output: pricePerMOutput } = modelPricing

  // validate
  if (
    typeof pricePerMInput !== "number" ||
    typeof pricePerMOutput !== "number"
  ) {
    console.error(`Invalid pricing data for: ${modelName}`, modelPricing)
    return { input: 0, output: 0, total: 0 }
  }

  // convert to $ per token
  const perTokenInput = pricePerMInput / 1_000_000
  const perTokenOutput = pricePerMOutput / 1_000_000

  const inputCost = promptTokens * perTokenInput
  const outputCost = completionTokens * perTokenOutput
  const totalCost = inputCost + outputCost

  // round to 8 decimals (≈ micro-dollar precision)
  return {
    input: Number(inputCost.toFixed(8)),
    output: Number(outputCost.toFixed(8)),
    total: Number(totalCost.toFixed(8)),
  }
}

/**
 * Calculate the USD cost of a completion given token usage and per-million-token pricing.
 */
export function calculateUsageCost(
  usage: Partial<VercelUsage> = {},
  modelName: ModelName
): number {
  if (usage === null || usage === undefined || isNir(modelName)) {
    console.error(
      `Invalid usage or model name: ${JSON.stringify(usage)} ${JSON.stringify(modelName)}`
    )
    return 0
  }
  const { promptTokens = 0, completionTokens = 0 } = usage

  const modelPricing = pricing[modelName]
  if (!modelPricing) {
    console.error(`Model pricing not found for: ${modelName}`)
    return 0
  }
  const { input: pricePerMInput, output: pricePerMOutput } = modelPricing

  // validate
  if (
    typeof pricePerMInput !== "number" ||
    typeof pricePerMOutput !== "number"
  ) {
    console.error(`Invalid pricing data for: ${modelName}`, modelPricing)
    return 0
  }

  // convert to $ per token
  const perTokenInput = pricePerMInput / 1_000_000
  const perTokenOutput = pricePerMOutput / 1_000_000

  const rawCost =
    promptTokens * perTokenInput + completionTokens * perTokenOutput

  // round to 6 decimals (≈ micro-dollar precision)
  return Number(rawCost.toFixed(8))
}

export function calculateCost(model: string, usage: TokenUsage): number {
  const modelPricing = pricing[model as ModelName]
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
