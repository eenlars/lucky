import { MODEL_CONFIG } from "@core/core-config/compat"
import { providersV2 } from "@core/utils/spending/modelInfo"
import type { ModelName, ModelPricingV2 } from "@core/utils/spending/models.types"
import { getCurrentProvider } from "@core/utils/spending/provider"
import type { LuckyProvider } from "@lucky/shared"
import { isNir } from "@lucky/shared/client"

// Get all active models from provider structure
export const getActiveModelNames = (customProvider?: LuckyProvider): string[] => {
  const provider = customProvider ?? getCurrentProvider()
  if (isNir(provider)) return []

  return Object.keys(providersV2[provider]).filter(modelName => isActiveModel(modelName as ModelName))
}

// Check if a model is active
export function isActiveModel(model: string): boolean {
  const provider: LuckyProvider = getCurrentProvider()
  const models = providersV2[provider]
  const modelConfig = models?.[model as keyof typeof models] as ModelPricingV2 | undefined

  // Check both the providersV2 active flag AND the MODEL_CONFIG inactive array
  return Boolean(modelConfig?.active === true && !MODEL_CONFIG.inactive.includes(model))
}

// Get model pricing for a given model name. Throws if the model is unknown.
export function getModelV2(model: string, customProvider?: LuckyProvider): ModelPricingV2 {
  // get current provider
  const provider: LuckyProvider = customProvider ?? getCurrentProvider()

  if (!provider || !model) {
    throw new Error("getModelV2: No provider or model provided")
  }

  const models = providersV2[provider]
  const modelConfig = models?.[model as keyof typeof models]

  if (!modelConfig) {
    const available = getActiveModelNames().join(", ")
    console.warn(`getModelV2: Model ${model} not found. Available models: ${available}`)
    throw new Error(`getModelV2: Model ${model} not found. Available models: ${available}`)
  }

  // if (!modelConfig.active) {
  //   lgg.warn(`getModelV2: Model ${model} is not active`)
  //   return null
  // }

  return modelConfig
}
