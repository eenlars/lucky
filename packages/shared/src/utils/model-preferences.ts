/**
 * Model Preferences Utilities
 * Helper functions for working with user model preferences
 *
 * CRITICAL: Never parse model ID strings to extract provider info.
 * Always look up models in MODEL_CATALOG to get the actual API provider.
 */

import type { LuckyGateway, ModelId, UserGatewayPreferences } from "../contracts/llm-contracts/providers"

/**
 * Get user's enabled models for a specific provider
 *
 * @param preferences - User's model preferences
 * @param gateway - Gateway name to filter by
 * @returns Array of enabled model IDs for that gateway
 */
export function getEnabledModelsForGateway(
  preferences: UserGatewayPreferences | null,
  gateway: LuckyGateway,
): ModelId[] {
  if (!preferences) return []

  const providerSettings = preferences.gateways.find(p => p.gateway === gateway)
  return providerSettings?.enabledModels || []
}

/**
 * Check if a specific model is enabled
 *
 * @param preferences - User's model preferences
 * @param modelId - Full model ID to check
 * @returns True if the model is enabled
 */
export function isModelEnabled(preferences: UserGatewayPreferences | null, modelId: ModelId): boolean {
  if (!preferences) return false

  return preferences.gateways.some(p => p.enabledModels.includes(modelId))
}

/**
 * Get all enabled model IDs across all providers
 *
 * @param preferences - User's model preferences
 * @returns Set of all enabled model IDs
 */
export function getAllEnabledModels(preferences: UserGatewayPreferences | null): Set<ModelId> {
  if (!preferences) return new Set()

  const allModels = preferences.gateways.flatMap(p => p.enabledModels)
  return new Set(allModels)
}

/**
 * Update enabled models for a specific provider
 *
 * @param preferences - Current user preferences
 * @param gateway - Gateway to update
 * @param enabledModels - New list of enabled model IDs
 * @returns Updated preferences
 */
export function setEnabledModelsForGateway(
  preferences: UserGatewayPreferences,
  gateway: LuckyGateway,
  enabledModels: ModelId[],
): UserGatewayPreferences {
  const existingProviderIndex = preferences.gateways.findIndex(p => p.gateway === gateway)

  if (existingProviderIndex >= 0) {
    // Update existing provider
    const updatedGateways = [...preferences.gateways]
    updatedGateways[existingProviderIndex] = {
      ...updatedGateways[existingProviderIndex],
      enabledModels,
      metadata: {
        ...updatedGateways[existingProviderIndex].metadata,
        apiKeyConfigured: updatedGateways[existingProviderIndex].metadata?.apiKeyConfigured ?? false,
        lastUpdated: new Date().toISOString(),
      },
    }

    return {
      ...preferences,
      gateways: updatedGateways,
      lastSynced: new Date().toISOString(),
    }
  }
  // Add new gateway
  return {
    ...preferences,
    gateways: [
      ...preferences.gateways,
      {
        gateway,
        enabledModels,
        isEnabled: true,
        metadata: {
          apiKeyConfigured: false,
          lastUpdated: new Date().toISOString(),
        },
      },
    ],
    lastSynced: new Date().toISOString(),
  }
}

/**
 * Toggle a single model on/off
 *
 * @param preferences - Current user preferences
 * @param gateway - Gateway the model belongs to
 * @param modelId - Model ID to toggle
 * @returns Updated preferences
 */
export function toggleModel(
  preferences: UserGatewayPreferences,
  gateway: LuckyGateway,
  modelId: ModelId,
): UserGatewayPreferences {
  const enabledModels = getEnabledModelsForGateway(preferences, gateway)
  const isEnabled = enabledModels.includes(modelId)

  const newEnabledModels = isEnabled ? enabledModels.filter(id => id !== modelId) : [...enabledModels, modelId]

  return setEnabledModelsForGateway(preferences, gateway, newEnabledModels)
}
