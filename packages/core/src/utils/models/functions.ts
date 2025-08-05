import type { ModelName } from "@utils/models/models"
import { pricing } from "@utils/models/models"
import type { ModelRuntimeConfig } from "@utils/config/runtimeConfig.types"

// Get all active models from provider structure
export const getActiveModels = (): ModelName[] => {
  return Object.entries(pricing)
    .filter(([_, config]) => config.active)
    .map(([modelName]) => modelName as ModelName)
}

// Get all inactive models from provider structure
export const getInactiveModels = (): ModelName[] => {
  return Object.entries(pricing)
    .filter(([_, config]) => !config.active)
    .map(([modelName]) => modelName as ModelName)
}

// Change this literal to switch providers - TypeScript will instantly re-type-check MODELS
export const CURRENT_PROVIDER =
  "openrouter" as const satisfies ModelRuntimeConfig["provider"]
