/**
 * Model tier mapping functions
 */

import type { ModelId, TierName } from "@lucky/shared"
import { findModel } from "./llm-catalog/catalog-queries"

/**
 * Maps a model name to its recommended tier category
 * Useful for logging, observability, and reverse-mapping
 *
 * @param modelName - Catalog ID (e.g., "openai#gpt-4o-mini") or model name
 * @returns The tier that best represents this model's characteristics
 *
 * @example
 * mapModelToTier("openai#gpt-4o-mini") // "cheap"
 * mapModelToTier("openai#gpt-4o") // "smart"
 * mapModelToTier("groq#openai/gpt-oss-20b") // "fast"
 */
export function mapModelToTier(modelName: ModelId): TierName {
  const model = findModel(modelName)

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
 * Maps a model name to its easy tier name (alias for mapModelToTier)
 * Takes a model name in <provider>#<model> format and returns a tier name
 *
 * @param modelName - Model ID in format "provider#model" (e.g., "openai#gpt-4o-mini")
 * @returns One of the four tier names: "cheap", "fast", "smart", or "balanced"
 *
 * @example
 * mapModelNameToEasyName("openai#gpt-4o-mini") // "cheap"
 * mapModelNameToEasyName("openai#gpt-4o") // "smart"
 * mapModelNameToEasyName("groq#llama-3.1-70b-versatile") // "smart"
 * mapModelNameToEasyName("groq#openai/gpt-oss-20b") // "fast"
 * mapModelNameToEasyName("openrouter#openai/gpt-4o") // "smart"
 * mapModelNameToEasyName("unknown#model") // "balanced" (fallback)
 */
export function mapModelNameToEasyName(modelName: string): TierName {
  return mapModelToTier(modelName)
}
