/**
 * Model validation and fallback utilities
 * Ensures workflows use models available in user's preferences
 */

import { findModel } from "@lucky/models"
import type { ModelEntry, UserGatewayPreferences } from "@lucky/shared"

/**
 * Get all enabled model IDs from user preferences
 */
export function getAllEnabledModelIds(preferences: UserGatewayPreferences | null): Set<string> {
  const enabledIds = new Set<string>()

  if (!preferences) return enabledIds

  for (const gateway of preferences.gateways) {
    if (gateway.isEnabled) {
      for (const modelId of gateway.enabledModels) {
        enabledIds.add(modelId)
      }
    }
  }

  return enabledIds
}

/**
 * Check if a model ID exists in user's enabled models
 * Handles both catalog ID format (provider#model) and plain model names
 */
export function isModelInPreferences(modelId: string, preferences: UserGatewayPreferences | null): boolean {
  if (!preferences) return false

  const enabledIds = getAllEnabledModelIds(preferences)

  // Direct match
  if (enabledIds.has(modelId)) return true

  // Try finding in catalog and checking with catalog ID
  const catalogEntry = findModel(modelId)
  if (catalogEntry && enabledIds.has(catalogEntry.gatewayModelId)) return true

  // Try matching without provider prefix (e.g., "gpt-4o-mini" matches "gpt-4o-mini")
  for (const enabledId of enabledIds) {
    const gatewayModelId = enabledId.includes("#") ? enabledId.split("#")[1] : enabledId
    if (gatewayModelId === modelId) return true
  }

  return false
}

/**
 * Pick the best available model from user's preferences
 * Tries to match the intelligence/speed tier of the original model
 */
export function pickFallbackModel(originalModelId: string, preferences: UserGatewayPreferences | null): string | null {
  if (!preferences) return null

  // Get original model's characteristics
  const originalModel = findModel(originalModelId)

  // Get all enabled models as catalog entries
  const enabledModelIds = getAllEnabledModelIds(preferences)
  const enabledModels: ModelEntry[] = []

  for (const modelId of enabledModelIds) {
    const entry = findModel(modelId)
    if (entry && entry.runtimeEnabled !== false) {
      enabledModels.push(entry)
    }
  }

  if (enabledModels.length === 0) return null

  // If we found the original model's characteristics, try to match tier
  if (originalModel) {
    // Try to find a model with same intelligence level
    const sameIntelligence = enabledModels.filter(m => m.intelligence === originalModel.intelligence)
    if (sameIntelligence.length > 0) {
      // Prefer same speed if possible
      const sameSpeed = sameIntelligence.find(m => m.speed === originalModel.speed)
      if (sameSpeed) return sameSpeed.gatewayModelId

      // Otherwise return first with same intelligence
      return sameIntelligence[0].gatewayModelId
    }
  }

  // Fallback: Pick the highest intelligence model available
  const sorted = [...enabledModels].sort((a, b) => {
    // Higher intelligence preferred
    if (b.intelligence !== a.intelligence) {
      return b.intelligence - a.intelligence
    }
    // Then prefer faster speed
    const speedScore = (m: ModelEntry) => (m.speed === "fast" ? 3 : m.speed === "balanced" ? 2 : 1)
    return speedScore(b) - speedScore(a)
  })

  return sorted[0]?.gatewayModelId || null
}
