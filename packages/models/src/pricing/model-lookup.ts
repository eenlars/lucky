/**
 * Model Lookup Utilities
 *
 * Provides simple lookups in MODEL_CATALOG.
 * All catalog IDs use structured format: "vendor:X;model:Y"
 * This format makes it IMPOSSIBLE to confuse with API identifiers.
 *
 * IMPORTANT: Never parse catalog ID strings to determine provider.
 * Always look up the `provider` field in the catalog entry.
 */

import type { CatalogId, ModelEntry } from "@lucky/shared"
import { MODEL_CATALOG } from "./catalog"

/**
 * Find a model in the catalog by its exact catalog ID.
 *
 * @param catalogId - Catalog identifier (format: "vendor:X;model:Y")
 * @returns ModelEntry if found, undefined otherwise
 *
 * @example
 * ```ts
 * findModel("vendor:openai;model:gpt-4.1-mini") // ✓ correct
 * findModel("vendor:anthropic;model:claude-sonnet-4") // ✓ correct (uses openrouter provider!)
 * findModel("gpt-4.1-mini") // ✗ wrong - will not be found
 * findModel("openai/gpt-4.1-mini") // ✗ wrong - old format
 * ```
 */
export function findModel(catalogId: CatalogId | string): ModelEntry | undefined {
  return MODEL_CATALOG.find(m => m.id === catalogId)
}

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
 * findModelByName("openai/gpt-oss-20b") // ✓ finds Groq model
 * ```
 */
export function findModelByName(modelName: string): ModelEntry | undefined {
  return MODEL_CATALOG.find(m => m.model === modelName)
}

/**
 * Get a model from the catalog by catalog ID. Throws if not found.
 *
 * @param catalogId - Catalog identifier (format: "vendor:X;model:Y")
 * @throws Error if model not found
 * @returns ModelEntry
 */
export function getModel(catalogId: CatalogId | string): ModelEntry {
  const entry = findModel(catalogId)

  if (!entry) {
    const availableModels = MODEL_CATALOG.filter(m => m.active)
      .map(m => m.id)
      .slice(0, 10)
      .join(", ")

    throw new Error(
      `Model "${catalogId}" not found in catalog. Catalog IDs must use format "vendor:X;model:Y" (e.g., "vendor:openai;model:gpt-4.1-mini"). Available models (first 10): ${availableModels}...`,
    )
  }

  return entry
}

/**
 * Check if a model is active in the catalog.
 *
 * @param catalogId - Catalog identifier (format: "vendor:X;model:Y")
 * @returns true if model exists and is active, false otherwise
 */
export function isModelActive(catalogId: CatalogId | string): boolean {
  const entry = findModel(catalogId)
  return entry?.active === true
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
  return MODEL_CATALOG.filter(m => m.provider === provider && m.active)
}

/**
 * Get all active catalog IDs (structured format: "vendor:X;model:Y").
 *
 * @returns Array of active catalog IDs
 */
export function getActiveModelIds(): CatalogId[] {
  return MODEL_CATALOG.filter(m => m.active).map(m => m.id) as CatalogId[]
}
