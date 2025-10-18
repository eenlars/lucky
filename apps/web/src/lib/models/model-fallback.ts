/**
 * Model validation and fallback utilities
 * Ensures workflows use models available in user's preferences
 */

import { findModelById } from "@lucky/models"
import type { ModelEntry, UserModelPreferences } from "@lucky/shared"

/**
 * Get all enabled model IDs from user preferences
 */
export function getAllEnabledModelIds(preferences: UserModelPreferences | null): Set<string> {
  const enabledIds = new Set<string>()

  if (!preferences) return enabledIds

  for (const provider of preferences.providers) {
    if (provider.isEnabled) {
      for (const modelId of provider.enabledModels) {
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
export function isModelInPreferences(modelId: string, preferences: UserModelPreferences | null): boolean {
  if (!preferences) return false

  const enabledIds = getAllEnabledModelIds(preferences)

  // Direct match
  if (enabledIds.has(modelId)) return true

  // Try finding in catalog and checking with catalog ID
  const catalogEntry = findModelById(modelId)
  if (catalogEntry && enabledIds.has(catalogEntry.id)) return true

  // Try matching without provider prefix (e.g., "gpt-4o-mini" matches "openai#gpt-4o-mini")
  for (const enabledId of enabledIds) {
    const modelName = enabledId.includes("#") ? enabledId.split("#")[1] : enabledId
    if (modelName === modelId) return true
  }

  return false
}

/**
 * Pick the best available model from user's preferences
 * Tries to match the intelligence/speed tier of the original model
 */
export function pickFallbackModel(originalModelId: string, preferences: UserModelPreferences | null): string | null {
  if (!preferences) return null

  // Get original model's characteristics
  const originalModel = findModelById(originalModelId)

  // Get all enabled models as catalog entries
  const enabledModelIds = getAllEnabledModelIds(preferences)
  const enabledModels: ModelEntry[] = []

  for (const modelId of enabledModelIds) {
    const entry = findModelById(modelId)
    if (entry?.runtimeEnabled) {
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
      if (sameSpeed) return sameSpeed.id

      // Otherwise return first with same intelligence
      return sameIntelligence[0].id
    }
  }

  // Fallback: Pick the highest intelligence model available
  const sorted = [...enabledModels].sort((a, b) => {
    // Higher intelligence preferred
    if (b.intelligence !== a.intelligence) {
      return b.intelligence - a.intelligence
    }
    // Then prefer faster speed
    const speedScore = (m: ModelEntry) => (m.speed === "fast" ? 3 : m.speed === "medium" ? 2 : 1)
    return speedScore(b) - speedScore(a)
  })

  return sorted[0]?.id || null
}
