/**
 * Model Preferences Utilities
 * Helper functions for working with user model preferences
 *
 * CRITICAL: Never parse model ID strings to extract provider info.
 * Always look up models in MODEL_CATALOG to get the actual API provider.
 */

import type { ModelId, UserModelPreferences } from "../contracts/providers"

/**
 * Normalize a model name to a full model ID
 * If it already includes the provider prefix, return as-is
 * Otherwise, prepend the provider
 *
 * @param provider - The provider name (e.g., "openai")
 * @param modelName - The model name (e.g., "gpt-4o" or "openai/gpt-4o")
 * @returns Full model ID (e.g., "openai/gpt-4o")
 */
export function normalizeModelId(provider: string, modelName: string): ModelId {
  if (modelName.includes("/")) return modelName as ModelId
  return `${provider}/${modelName}` as ModelId
}

/**
 * Get user's enabled models for a specific provider
 *
 * @param preferences - User's model preferences
 * @param provider - Provider name to filter by
 * @returns Array of enabled model IDs for that provider
 */
export function getEnabledModelsForProvider(preferences: UserModelPreferences | null, provider: string): ModelId[] {
  if (!preferences) return []

  const providerSettings = preferences.providers.find(p => p.provider === provider)
  return providerSettings?.enabledModels || []
}

/**
 * Check if a specific model is enabled
 *
 * @param preferences - User's model preferences
 * @param modelId - Full model ID to check
 * @returns True if the model is enabled
 */
export function isModelEnabled(preferences: UserModelPreferences | null, modelId: ModelId): boolean {
  if (!preferences) return false

  return preferences.providers.some(p => p.enabledModels.includes(modelId))
}

/**
 * Get all enabled model IDs across all providers
 *
 * @param preferences - User's model preferences
 * @returns Set of all enabled model IDs
 */
export function getAllEnabledModels(preferences: UserModelPreferences | null): Set<ModelId> {
  if (!preferences) return new Set()

  const allModels = preferences.providers.flatMap(p => p.enabledModels)
  return new Set(allModels)
}

/**
 * Update enabled models for a specific provider
 *
 * @param preferences - Current user preferences
 * @param provider - Provider to update
 * @param enabledModels - New list of enabled model IDs
 * @returns Updated preferences
 */
export function setEnabledModelsForProvider(
  preferences: UserModelPreferences,
  provider: string,
  enabledModels: ModelId[],
): UserModelPreferences {
  const existingProviderIndex = preferences.providers.findIndex(p => p.provider === provider)

  if (existingProviderIndex >= 0) {
    // Update existing provider
    const updatedProviders = [...preferences.providers]
    updatedProviders[existingProviderIndex] = {
      ...updatedProviders[existingProviderIndex],
      enabledModels,
      metadata: {
        ...updatedProviders[existingProviderIndex].metadata,
        apiKeyConfigured: updatedProviders[existingProviderIndex].metadata?.apiKeyConfigured ?? false,
        lastUpdated: new Date().toISOString(),
      },
    }

    return {
      ...preferences,
      providers: updatedProviders,
      lastSynced: new Date().toISOString(),
    }
  }
  // Add new provider
  return {
    ...preferences,
    providers: [
      ...preferences.providers,
      {
        provider,
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
 * @param provider - Provider the model belongs to
 * @param modelId - Model ID to toggle
 * @returns Updated preferences
 */
export function toggleModel(
  preferences: UserModelPreferences,
  provider: string,
  modelId: ModelId,
): UserModelPreferences {
  const enabledModels = getEnabledModelsForProvider(preferences, provider)
  const isEnabled = enabledModels.includes(modelId)

  const newEnabledModels = isEnabled ? enabledModels.filter(id => id !== modelId) : [...enabledModels, modelId]

  return setEnabledModelsForProvider(preferences, provider, newEnabledModels)
}
