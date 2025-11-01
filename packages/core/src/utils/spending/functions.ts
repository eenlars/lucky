import { getCoreConfig } from "@core/core-config/coreConfig"
import { findModel, getActiveModelsByGateway } from "@lucky/models"
import type { LuckyGateway } from "@lucky/shared"
import { isNir } from "@lucky/shared/client"
import { getCurrentGateway } from "./provider"

// Get all active models from provider structure
export const getActiveGatewayModelIds = <T extends LuckyGateway>(customProvider?: T): string[] => {
  const provider = customProvider ?? getCurrentGateway()
  if (isNir(provider)) return []

  return getActiveModelsByGateway(provider)
    .filter(model => model.runtimeEnabled !== false)
    .filter(model => !getCoreConfig().models.inactive.includes(model.gatewayModelId))
    .map(model => model.gatewayModelId)
}

// Check if a model is active
export function isActiveModel(gatewayModelId: string): boolean {
  // Try catalog ID format first (e.g., "gpt-4.1-mini")
  let modelEntry = findModel(gatewayModelId)

  // If not found, try API model name format (e.g., "gpt-4.1-mini")
  if (!modelEntry) {
    modelEntry = findModel(gatewayModelId)
  }

  if (!modelEntry) return false

  // Check both the catalog active flag AND the getCoreConfig().models.inactive array
  // Note: inactive list uses catalog IDs (provider#model)
  return modelEntry.runtimeEnabled !== false && !getCoreConfig().models.inactive.includes(modelEntry.gatewayModelId)
}
