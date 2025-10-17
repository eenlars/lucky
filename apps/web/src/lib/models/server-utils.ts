"use server"

import { createRLSClient } from "@/lib/supabase/server-rls"
import { findModel } from "@lucky/models"
import type { ModelEntry } from "@lucky/shared"

/**
 * Server-side model utilities for fetching user-specific model data.
 * These functions interact with the database and should only run on the server.
 */

/**
 * Fetch user's available models from the database.
 * Converts enabled model IDs to full ModelEntry objects from the catalog.
 *
 * @param clerkId - The authenticated user's Clerk ID
 * @returns Array of ModelEntry objects for all enabled models across all enabled providers
 *
 * @example
 * ```ts
 * const models = await getUserModels(clerkId)
 * // Returns: [{ id: "openai#gpt-4o", provider: "openai", model: "gpt-4o", ... }, ...]
 * ```
 */
export async function getUserModels(clerkId: string): Promise<ModelEntry[]> {
  const supabase = await createRLSClient()

  const { data, error } = await supabase
    .schema("app")
    .from("provider_settings")
    .select("enabled_models, is_enabled")
    .eq("clerk_id", clerkId)
    .eq("is_enabled", true) // Only get enabled providers

  if (error) {
    console.error("[getUserModels] Failed to fetch provider settings:", error)
    return []
  }

  // Collect all enabled model IDs
  const allEnabledModelIds = new Set<string>()
  for (const row of data) {
    const enabledModels = (row.enabled_models as string[]) || []
    for (const modelId of enabledModels) {
      allEnabledModelIds.add(modelId)
    }
  }

  // Convert model IDs to ModelEntry objects
  const modelEntries: ModelEntry[] = []
  for (const modelId of allEnabledModelIds) {
    const entry = findModel(modelId)
    if (entry?.runtimeEnabled) {
      modelEntries.push(entry)
    } else {
      console.warn(`[getUserModels] Model "${modelId}" not found in catalog or inactive`)
    }
  }

  return modelEntries
}
