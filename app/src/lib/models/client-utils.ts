/**
 * Client-safe model utilities for React components
 * Provides the same functionality as @core/utils/spending/functions
 * without server-side dependencies
 */
import { isNir } from "@core/utils/common/isNir"
import { providersV2 } from "@core/utils/spending/modelInfo"
import type {
  AllowedModelName,
  ModelName,
  ModelPricingV2,
} from "@core/utils/spending/models.types"
import {
  CURRENT_PROVIDER,
  type LuckyProvider,
} from "@core/utils/spending/provider"
import { MODEL_CONFIG } from "@runtime/settings/models"

// Get all active models from provider structure
export const getActiveModelNames = <T extends LuckyProvider>(
  customProvider: T = CURRENT_PROVIDER as T
): AllowedModelName<T>[] => {
  if (isNir(customProvider)) return []

  return Object.keys(providersV2[customProvider])
    .filter((modelName) => isActiveModel(modelName as ModelName))
    .map((modelName) => modelName as AllowedModelName<T>)
}

// Type guard to check if a model is active
export function isActiveModel(model: string): model is AllowedModelName {
  const modelConfig = providersV2[CURRENT_PROVIDER][model as ModelName]

  // Check both the providersV2 active flag AND the MODEL_CONFIG inactive set
  return modelConfig?.active === true && !MODEL_CONFIG.inactive.has(model)
}

// Get model pricing for a given model name. Throws if the model is unknown.
export function getModelV2(model: string): ModelPricingV2 {
  // get current provider
  const provider = CURRENT_PROVIDER

  if (!provider || !model) {
    throw new Error("getModelV2: No provider or model provided")
  }

  const modelConfig = providersV2[provider]?.[model as ModelName]

  if (!modelConfig) {
    const available = getActiveModelNames().join(", ")
    // Use console.warn for client-side logging instead of lgg
    console.warn(
      `getModelV2: Model ${model} not found. Available models: ${available}`
    )
    throw new Error(
      `getModelV2: Model ${model} not found. Available models: ${available}`
    )
  }

  return modelConfig
}
