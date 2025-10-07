/**
 * Bidirectional resolution between tier names and model names.
 * Provides backward compatibility by detecting tier names and converting them
 * to the tier: format expected by @lucky/models.
 */

import { getDefaultModels } from "@core/core-config"
import type { ModelName } from "@core/utils/spending/models.types"

/**
 * All available tier names in the system.
 */
const TIER_NAMES = ["nano", "low", "medium", "high", "default", "fitness", "reasoning", "summary", "fallback"] as const

export type TierName = (typeof TIER_NAMES)[number]

/**
 * Check if a string is a tier name.
 */
export function isTierName(name: string): name is TierName {
  return TIER_NAMES.includes(name as TierName)
}

/**
 * Resolve a model name or tier name to the format expected by @lucky/models.
 *
 * Examples:
 * - "nano" -> "tier:nano"
 * - "openai/gpt-4" -> "openai/gpt-4"
 * - "tier:high" -> "tier:high" (already in correct format)
 */
export function resolveTierOrModel(input: ModelName | string): string {
  const inputStr = String(input)

  // Already in tier: format
  if (inputStr.startsWith("tier:")) {
    return inputStr
  }

  // Check if it's a tier name
  if (isTierName(inputStr)) {
    return `tier:${inputStr}`
  }

  // Otherwise, assume it's a provider/model format
  return inputStr
}

/**
 * Get the actual model name for a tier.
 * Useful for logging and debugging.
 */
export function getTierModel(tierName: TierName): ModelName {
  const models = getDefaultModels()
  return models[tierName]
}

/**
 * Resolve a tier name back to the actual model being used.
 * Returns undefined if not a tier name.
 */
export function resolveTierToModel(input: string): ModelName | undefined {
  // Handle tier: prefix
  const tierName = input.startsWith("tier:") ? input.slice(5) : input

  if (isTierName(tierName)) {
    return getTierModel(tierName)
  }

  return undefined
}
