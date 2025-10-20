import { findModel } from "@lucky/models"
import { isNir } from "@lucky/shared"
import type { VercelUsage } from "./calculatePricing"

/**
 * Calculate the USD cost of a completion given token usage and per-million-token pricing.
 */
export function calculateUsageCost(usage: Partial<VercelUsage>, gatewayModelId: string): number {
  if (usage === null || usage === undefined || isNir(gatewayModelId)) {
    console.error(`Invalid usage or model name: ${JSON.stringify(usage)} ${JSON.stringify(gatewayModelId)}`)
    return 0
  }
  const { promptTokens = 0, completionTokens = 0 } = usage

  let modelPricing: any
  try {
    modelPricing = findModel(gatewayModelId)
  } catch (_err) {
    console.error(`Model pricing not found for: ${gatewayModelId}`)
    return 0
  }

  // Check if modelPricing is undefined before destructuring
  if (!modelPricing) {
    console.error(`Model pricing not found for: ${gatewayModelId}`)
    return 0
  }

  const { input: pricePerMInput, output: pricePerMOutput } = modelPricing

  // validate
  if (typeof pricePerMInput !== "number" || typeof pricePerMOutput !== "number") {
    console.error(`Invalid pricing data for: ${gatewayModelId}`, modelPricing)
    return 0
  }

  // convert to $ per token
  const perTokenInput = pricePerMInput / 1_000_000
  const perTokenOutput = pricePerMOutput / 1_000_000

  const rawCost = promptTokens * perTokenInput + completionTokens * perTokenOutput

  // round to 6 decimals (≈ micro-dollar precision)
  return Number(rawCost.toFixed(8))
}
