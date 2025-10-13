import { getCoreConfig } from "@core/core-config/coreConfig"
import type { ModelName, ModelPricingV2 } from "@core/utils/spending/models.types"
import { getCurrentProvider } from "@core/utils/spending/provider"
import { findModel, getActiveModelIds, getActiveModelsByProvider } from "@lucky/models"
import type { LuckyProvider } from "@lucky/shared"
import { isNir } from "@lucky/shared/client"

// Get all active models from provider structure
export const getActiveModelNames = (customProvider?: LuckyProvider): string[] => {
  const provider = customProvider ?? getCurrentProvider()
  if (isNir(provider)) return []

  // Use MODEL_CATALOG instead of providersV2
  return getActiveModelsByProvider(provider)
    .filter(model => !getCoreConfig().models.inactive.includes(model.id))
    .map(model => model.id)
}

// Check if a model is active
export function isActiveModel(model: string): boolean {
  const provider: LuckyProvider = getCurrentProvider()

  // Look up in MODEL_CATALOG (supports both prefixed and unprefixed)
  const modelEntry = findModel(model, provider)

  // Check both the catalog active flag AND the getCoreConfig().models.inactive array
  return Boolean(modelEntry?.active === true && !getCoreConfig().models.inactive.includes(model))
}

/**
 * Get model pricing for a given model name. Throws if the model is unknown.
 * @deprecated Use getModel() from @lucky/models instead which returns the full ModelEntry.
 * This function converts ModelEntry to the legacy ModelPricingV2 format.
 */
export function getModelV2(model: string, customProvider?: LuckyProvider): ModelPricingV2 {
  // get current provider
  const provider: LuckyProvider = customProvider ?? getCurrentProvider()

  if (!provider || !model) {
    throw new Error("getModelV2: No provider or model provided")
  }

  // Look up in MODEL_CATALOG instead of providersV2
  const modelEntry = findModel(model, provider)

  if (!modelEntry) {
    const available = getActiveModelIds().slice(0, 20).join(", ")
    console.warn(`getModelV2: Model ${model} not found. Available models (first 20): ${available}`)
    throw new Error(`getModelV2: Model ${model} not found. Available models: ${available}`)
  }

  // Convert ModelEntry to ModelPricingV2 format for backwards compatibility
  return {
    id: modelEntry.id,
    input: modelEntry.input,
    "cached-input": modelEntry.cachedInput,
    output: modelEntry.output,
    info: `IQ:${modelEntry.intelligence}/10;speed:${modelEntry.speed};pricing:${modelEntry.pricingTier};` as const,
    context_length: modelEntry.contextLength,
    active: modelEntry.active,
  }
}
