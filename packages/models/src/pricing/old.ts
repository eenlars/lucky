// Cast to lose all literal type information - prevents TypeScript memory issues

import type { LuckyProvider } from "@lucky/shared"
import { getActiveProviders } from "./catalog"
import { getActiveModelsByProvider } from "./model-lookup"

/**
 * Get all active models from a specific provider (pure function, no runtime deps)
 * @param provider - The provider to get active models from
 * @returns Array of active model names
 * @deprecated Use getActiveModelsByProvider() from @lucky/models instead
 */
export function getActiveModelNamesFromProvider(provider: LuckyProvider): string[] {
  const models = getActiveModelsByProvider(provider)
  return models.map(m => m.model)
}
/**
 * Get active models with their metadata info
 * @deprecated Use MODEL_CATALOG from @lucky/models for model metadata
 */
export function getActiveModelsWithInfo(): string {
  const results: string[] = []
  for (const provider of getActiveProviders()) {
    const models = getActiveModelsByProvider(provider)
    for (const modelData of models) {
      if (modelData.active) {
        results.push(
          `modelName:${modelData.model},metadata:${modelData.intelligence}/${modelData.speed}/${modelData.pricingTier}`,
        )
      }
    }
  }
  return results.join(";")
}
