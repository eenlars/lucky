/**
 * Model tier mapping functions
 */

import type { ModelId, TierName } from "@lucky/shared"
import { findModel } from "./llm-catalog/catalog-queries"

/**
 * Maps a model name to its recommended tier category
 * Useful for logging, observability, and reverse-mapping
 *
 * @param gatewayModelId - Catalog ID (e.g., "gpt-4o-mini") or model name
 * @returns The tier that best represents this model's characteristics
 *
 * @example
 * mapModelToTier("gpt-4o-mini") // "cheap"
 * mapModelToTier("gpt-4o") // "smart"
 * mapModelToTier("openai/gpt-oss-20b") // "fast"
 */
export function mapModelToTier(gatewayModelId: ModelId): TierName {
  const model = findModel(gatewayModelId)

  if (!model) {
    return "balanced" // default fallback
  }

  // priority order: intelligence > speed > cost
  if (model.intelligence >= 8) {
    return "smart"
  }

  if (model.speed === "fast") {
    return "fast"
  }

  if (model.pricingTier === "low") {
    return "cheap"
  }

  return "balanced"
}

/**
 * Takes a model name in <gateway>#<model> format and returns a tier name
 * or the full ID if not in tier name format
 *
 * @param gatewayModelId - Model ID in format "gateway#model" (e.g., "gpt-4o-mini")
 * @returns One of the four tier names: "cheap", "fast", "smart", or "balanced"
 *
 * @example
 * mapGatewayModelIdToEasyName("gpt-4o-mini") // "cheap"
 * mapGatewayModelIdToEasyName("gpt-4o") // "smart"
 * mapGatewayModelIdToEasyName("llama-3.1-70b-versatile") // "smart"
 * mapGatewayModelIdToEasyName("openai/gpt-oss-20b") // "fast"
 * mapGatewayModelIdToEasyName("openai/gpt-4o") // "smart"
 * mapGatewayModelIdToEasyName("unknown#model") // "balanced" (fallback)
 */
export function mapGatewayModelIdToEasyName(gatewayModelId: string): TierName {
  return mapModelToTier(gatewayModelId)
}
