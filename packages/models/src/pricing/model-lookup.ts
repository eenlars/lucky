/**
 * Model Lookup Utilities
 *
 * Provides simple lookups in MODEL_CATALOG.
 * All catalog IDs use structured format: <provider>#<model>
 * This format makes it IMPOSSIBLE to confuse with API identifiers.
 *
 * IMPORTANT: Never parse catalog ID strings to determine provider.
 * Always look up the `provider` field in the catalog entry.
 */

import type { CatalogId, ModelEntry } from "@lucky/shared"
import { MODEL_CATALOG } from "./catalog"

/**
 * Find a model in the catalog by its model field (API format).
 * Use this when you have a model name from a workflow or API (e.g., "gpt-4o-mini").
 *
 * @param modelName - Model name in API format (e.g., "gpt-4o-mini", "anthropic/claude-sonnet-4")
 * @returns ModelEntry if found, undefined otherwise
 *
 * @example
 * ```ts
 * findModelByName("gpt-4o-mini") // ✓ finds OpenAI model
 * findModelByName("anthropic/claude-sonnet-4") // ✓ finds OpenRouter model
 * findModelByName("openrouter#openai/gpt-oss-20b") // ✓ finds Groq model
 * ```
 */
export function findModel(modelName: string): ModelEntry | undefined {
  // Perform a case-insensitive match to be forgiving with user input.
  // Catalog values are normalized (lowercase with provider prefixes when applicable),
  // but callers may provide uppercase or mixed-case variants.
  const needle = modelName.toLowerCase()
  return MODEL_CATALOG.find(m => m.model.toLowerCase() === needle || m.id.toLowerCase() === needle)
}

/**
 * Backwards-compatible alias for findModel
 * Maintains API used across core/app codepaths that still reference findModelByName.
 */
export const findModelByName = findModel

/**
 * Get a model from the catalog by catalog ID. Throws if not found.
 *
 * @param catalogId - Catalog identifier (format: "<provider>#<model>")
 * @throws Error if model not found
 * @returns ModelEntry
 */
export function getModel(catalogId: CatalogId | string): ModelEntry {
  const entry = findModel(catalogId)

  if (!entry) {
    const availableModels = MODEL_CATALOG.filter(m => m.runtimeEnabled)
      .map(m => m.id)
      .slice(0, 10)
      .join(", ")

    throw new Error(
      `Model "${catalogId}" not found in catalog. Catalog IDs must use format "<provider>#<model>" (e.g., "openai#gpt-4.1-mini"). Available models (first 10): ${availableModels}...`,
    )
  }

  return entry
}

/**
 * Check if a model is active in the catalog.
 *
 * @param catalogId - Catalog identifier (format: "<provider>#<model>")
 * @returns true if model exists and is active, false otherwise
 */
export function isModelActive(catalogId: CatalogId | string): boolean {
  return isRuntimeEnabled(catalogId)
}

/**
 * Get all active models from a specific provider.
 *
 * NOTE: The provider parameter here refers to which API the models use,
 * NOT the vendor prefix in the catalog ID. Use the catalog's provider field.
 *
 * @param provider - Provider name (e.g., "openai", "openrouter", "groq")
 * @returns Array of active ModelEntry objects
 */
export function getActiveModelsByProvider(provider: string): ModelEntry[] {
  return getRuntimeEnabledModelsByProvider(provider)
}

/**
 * Get all active catalog IDs (structured format: "<provider>#<model>").
 *
 * @returns Array of active catalog IDs
 */
export function getActiveModelIds(): CatalogId[] {
  return MODEL_CATALOG.filter(m => m.runtimeEnabled).map(m => m.id) as CatalogId[]
}

/**
 * Returns true if a model is enabled for runtime execution.
 */
export function isRuntimeEnabled(catalogId: CatalogId | string): boolean {
  const entry = findModel(catalogId)
  return entry?.runtimeEnabled === true
}

/**
 * Returns true if a model should be visible in UI model lists for the current env.
 * Hidden in production when `disabled` is true; always visible in development.
 */
export function isUIVisibleModel(entry: ModelEntry, env: string = process.env.NODE_ENV || "development"): boolean {
  return env === "development" ? true : !entry.uiHiddenInProd
}

/**
 * Get all runtime-enabled models for a specific provider.
 */
export function getRuntimeEnabledModelsByProvider(provider: string): ModelEntry[] {
  return MODEL_CATALOG.filter(m => m.provider === provider && m.runtimeEnabled)
}
