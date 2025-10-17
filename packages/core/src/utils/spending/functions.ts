import { getCoreConfig } from "@core/core-config/coreConfig"
import { getCurrentProvider } from "@core/utils/spending/provider"
import { findModel, getActiveModelsByProvider } from "@lucky/models"
import type { LuckyProvider } from "@lucky/shared"
import { isNir } from "@lucky/shared/client"

// Get all active models from provider structure
export const getActiveModelNames = <T extends LuckyProvider>(customProvider?: T): string[] => {
  const provider = customProvider ?? getCurrentProvider()
  if (isNir(provider)) return []

  return getActiveModelsByProvider(provider)
    .filter(model => model.runtimeEnabled)
    .filter(model => !getCoreConfig().models.inactive.includes(model.id))
    .map(model => model.id)
}

// Check if a model is active
export function isActiveModel(model: string): boolean {
  // Try catalog ID format first (e.g., "openai#gpt-4.1-mini")
  let modelEntry = findModel(model)

  // If not found, try API model name format (e.g., "gpt-4.1-mini")
  if (!modelEntry) {
    modelEntry = findModel(model)
  }

  if (!modelEntry) return false

  // Check both the catalog active flag AND the getCoreConfig().models.inactive array
  // Note: inactive list uses catalog IDs (provider#model)
  return modelEntry.runtimeEnabled === true && !getCoreConfig().models.inactive.includes(modelEntry.id)
}
