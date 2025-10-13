/**
 * Model Lookup Utilities
 *
 * Unified model lookup that handles both legacy unprefixed and new prefixed formats.
 * This is a migration helper - ultimately all lookups should use prefixed IDs.
 */

import type { ModelEntry } from "@lucky/shared"
import { MODEL_CATALOG } from "./catalog"

/**
 * Find a model in the catalog by ID, supporting both prefixed and unprefixed formats.
 *
 * @param modelId - Model identifier (prefixed like "openai/gpt-4" or unprefixed like "gpt-4")
 * @param provider - Optional provider to use when modelId is unprefixed (defaults to "openai")
 * @returns ModelEntry if found, undefined otherwise
 *
 * @example
 * ```ts
 * // Prefixed (recommended)
 * findModel("openai/gpt-4.1-mini") // ✓ works
 *
 * // Unprefixed (legacy, will be deprecated)
 * findModel("gpt-4.1-mini") // ✓ works, assumes openai provider
 * findModel("gpt-4.1-mini", "openai") // ✓ explicit provider
 * ```
 */
export function findModel(modelId: string, provider = "openai"): ModelEntry | undefined {
  // Try prefixed format first (this is the standard)
  let entry = MODEL_CATALOG.find(m => m.id === modelId)

  if (!entry && !modelId.includes("/")) {
    // Fallback: If unprefixed, try with provider prefix
    // This supports legacy code during migration
    entry = MODEL_CATALOG.find(m => m.id === `${provider}/${modelId}`)
  }

  return entry
}

/**
 * Get a model from the catalog by ID. Throws if not found.
 *
 * @param modelId - Model identifier (prefixed or unprefixed)
 * @param provider - Optional provider to use when modelId is unprefixed
 * @throws Error if model not found
 * @returns ModelEntry
 */
export function getModel(modelId: string, provider = "openai"): ModelEntry {
  const entry = findModel(modelId, provider)

  if (!entry) {
    const availableModels = MODEL_CATALOG.filter(m => m.active)
      .map(m => m.id)
      .slice(0, 10)
      .join(", ")

    throw new Error(`Model "${modelId}" not found in catalog. Available models (first 10): ${availableModels}...`)
  }

  return entry
}

/**
 * Normalize a model ID to the prefixed format.
 *
 * @param modelId - Model identifier (prefixed or unprefixed)
 * @param provider - Provider to use when modelId is unprefixed (defaults to "openai")
 * @returns Prefixed model ID (e.g., "openai/gpt-4.1-mini")
 *
 * @example
 * ```ts
 * normalizeModelId("gpt-4.1-mini") // "openai/gpt-4.1-mini"
 * normalizeModelId("openai/gpt-4.1-mini") // "openai/gpt-4.1-mini"
 * normalizeModelId("gpt-4.1-mini", "openrouter") // "openrouter/gpt-4.1-mini"
 * ```
 */
export function normalizeModelId(modelId: string, provider = "openai"): string {
  if (modelId.includes("/")) {
    return modelId // Already prefixed
  }
  return `${provider}/${modelId}`
}

/**
 * Check if a model is active in the catalog.
 *
 * @param modelId - Model identifier (prefixed or unprefixed)
 * @param provider - Optional provider to use when modelId is unprefixed
 * @returns true if model exists and is active, false otherwise
 */
export function isModelActive(modelId: string, provider = "openai"): boolean {
  const entry = findModel(modelId, provider)
  return entry?.active === true
}

/**
 * Get all active models from a specific provider.
 *
 * @param provider - Provider name (e.g., "openai", "openrouter", "groq")
 * @returns Array of active ModelEntry objects
 */
export function getActiveModelsByProvider(provider: string): ModelEntry[] {
  return MODEL_CATALOG.filter(m => m.provider === provider && m.active)
}

/**
 * Get all active model IDs (prefixed format).
 *
 * @returns Array of active model IDs
 */
export function getActiveModelIds(): string[] {
  return MODEL_CATALOG.filter(m => m.active).map(m => m.id)
}
