/**
 * Model name normalization utilities
 * These utilities handle conversion between different model name formats:
 * - Tier names (cheap/fast/smart/balanced) → preserved as-is
 * - Plain model names (gpt-4o) → catalog ID format (openai#gpt-4o)
 * - Already normalized (openai#gpt-4o) → preserved as-is
 */

import { tierNameSchema } from "@lucky/shared"
import { findModelByName } from "./llm-catalog/catalog-queries"

/**
 * Legacy tier name migrations
 * Maps deprecated tier names to current tier names
 */
const LEGACY_TIER_MIGRATIONS: Record<string, string> = {
  medium: "balanced",
  fallback: "balanced",
}

/**
 * Normalize a model name to its canonical form
 * - Tier names are preserved as-is (for execution-time resolution)
 * - Model names are normalized to catalog ID format (provider#model)
 * - Already normalized IDs are validated and preserved as-is
 *
 * @param modelName - Tier name, model name, or catalog ID
 * @returns Normalized model name
 * @throws {Error} If model name is not a valid tier or catalog model
 *
 * @example
 * normalizeModelName("cheap")              // → "cheap" (tier preserved)
 * normalizeModelName("gpt-4o")             // → "openai#gpt-4o" (normalized)
 * normalizeModelName("openai#gpt-4o")      // → "openai#gpt-4o" (already normalized)
 * normalizeModelName("unknown-model")      // → throws Error
 */
export function normalizeModelName(modelName: string): string {
  const modelNameLower = modelName.toLowerCase()

  // Migrate legacy tier names (e.g., "medium" → "balanced")
  const migratedName = LEGACY_TIER_MIGRATIONS[modelNameLower] ?? modelNameLower

  // Check if it's a tier name - preserve as-is for execution-time resolution
  const validTiers = tierNameSchema.options
  if (validTiers.includes(migratedName as any)) {
    return migratedName
  }

  // Lookup and normalize model name to catalog ID
  const catalogEntry = findModelByName(modelName)
  if (!catalogEntry) {
    throw new Error(`Model not found in catalog: ${modelName}`)
  }
  return catalogEntry.id
}
