/**
 * Model Lookup Utilities
 *
 * Provides simple lookups in MODEL_CATALOG.
 * All model IDs in the catalog are prefixed (e.g., "openai/gpt-4.1-mini").
 *
 * IMPORTANT: Never parse model ID strings to determine provider.
 * Always look up the `provider` field in the catalog entry.
 */

import type { ModelEntry } from "@lucky/shared"
import { MODEL_CATALOG } from "./catalog"

/**
 * Find a model in the catalog by its exact ID.
 *
 * @param modelId - Model identifier (must be prefixed like "openai/gpt-4.1-mini")
 * @returns ModelEntry if found, undefined otherwise
 *
 * @example
 * ```ts
 * findModel("openai/gpt-4.1-mini") // ✓ correct
 * findModel("anthropic/claude-sonnet-4") // ✓ correct (uses openrouter provider)
 * findModel("gpt-4.1-mini") // ✗ wrong - will not be found
 * ```
 */
export function findModel(modelId: string): ModelEntry | undefined {
  return MODEL_CATALOG.find(m => m.id === modelId)
}

/**
 * Get a model from the catalog by ID. Throws if not found.
 *
 * @param modelId - Model identifier (must be prefixed)
 * @throws Error if model not found
 * @returns ModelEntry
 */
export function getModel(modelId: string): ModelEntry {
  const entry = findModel(modelId)

  if (!entry) {
    const availableModels = MODEL_CATALOG.filter(m => m.active)
      .map(m => m.id)
      .slice(0, 10)
      .join(", ")

    throw new Error(
      `Model "${modelId}" not found in catalog. Model IDs must be prefixed (e.g., "openai/gpt-4.1-mini"). Available models (first 10): ${availableModels}...`,
    )
  }

  return entry
}

/**
 * Check if a model is active in the catalog.
 *
 * @param modelId - Model identifier (must be prefixed)
 * @returns true if model exists and is active, false otherwise
 */
export function isModelActive(modelId: string): boolean {
  const entry = findModel(modelId)
  return entry?.active === true
}

/**
 * Get all active models from a specific provider.
 *
 * NOTE: The provider parameter here refers to which API the models use,
 * NOT the prefix in the model ID. Use the catalog's provider field.
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
