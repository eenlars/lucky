import { isNir } from "@core/utils/common/isNir"
import { lgg } from "@core/utils/logging/Logger"
import { providersV2 } from "@core/utils/spending/modelInfo"
import type {
  ActiveModelName,
  ModelNameV2,
  ModelPricingV2,
} from "@core/utils/spending/models.types"
import {
  CURRENT_PROVIDER,
  type LuckyProvider,
} from "@core/utils/spending/provider"

// Get all active models from provider structure
export const getActiveModelNames = <T extends LuckyProvider>(
  customProvider: T = CURRENT_PROVIDER as T
): ModelNameV2<T>[] => {
  if (isNir(customProvider)) return []

  return Object.keys(providersV2[customProvider])
    .filter((modelName) => isActiveModel(modelName as ModelNameV2))
    .map((modelName) => modelName as ModelNameV2<T>)
}

// Type guard to check if a model is active
export function isActiveModel(model: string): model is ActiveModelName {
  const modelConfig = providersV2[CURRENT_PROVIDER][
    model as ModelNameV2<LuckyProvider>
  ] as ModelPricingV2
  return modelConfig?.active === true
}

// Get model pricing for a given model name
export function getModelV2(model: string): ModelPricingV2 | null {
  // get current provider
  const provider = CURRENT_PROVIDER

  if (!provider || !model) {
    throw new Error("getModelV2: No provider or model provided")
  }

  const modelConfig = providersV2[provider]?.[model as ModelNameV2]

  if (!modelConfig) {
    lgg.warn(`getModelV2: Model ${model} not found`)
    return null
  }

  return modelConfig
}
