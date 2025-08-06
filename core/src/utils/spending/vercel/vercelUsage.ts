import { isNir } from "@core/utils/common/isNir"
import type { VercelUsage } from "@core/utils/spending/vercel/calculatePricing"
import { pricingOLD, type ModelName } from "@runtime/settings/models"

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

  const modelPricing = pricingOLD[modelName]
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
