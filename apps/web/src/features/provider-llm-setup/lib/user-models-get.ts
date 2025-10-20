"use server"

import { NoEnabledModelsError } from "@/features/provider-llm-setup/errors/general"
import { UnknownDatabaseError } from "@/lib/db/errors/errors"
import { createContextAwareClient } from "@/lib/supabase/context-aware-client"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { findModel } from "@lucky/models"
import { type Database, type ModelEntry, type Principal, isNir } from "@lucky/shared"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { LuckyProvider } from "packages/shared"

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
export async function getUserModelsSetup(
  auth: { clerkId: string } | { principal: Principal },
  onlyIncludeProviders?: LuckyProvider[],
): Promise<ModelEntry[]> {
  let supabase: SupabaseClient<Database>
  let clerkId: string

  if ("clerkId" in auth) {
    // Direct clerk ID auth
    clerkId = auth.clerkId
    supabase = await createRLSClient()
  } else {
    // Principal-based auth
    clerkId = auth.principal.clerk_id
    supabase = await createContextAwareClient(auth.principal)
  }

  const { data, error } = await supabase
    .schema("app")
    .from("provider_settings")
    .select("enabled_models, is_enabled")
    .eq("clerk_id", clerkId)
    .eq("is_enabled", true) // Only get enabled providers

  if (error) {
    throw new UnknownDatabaseError(`[getUserModels] No enabled models found for user "${clerkId}"`)
  }

  // Collect all enabled model IDs
  const allEnabledModelIds = new Set<string>()
  for (const row of data) {
    const enabledModels = (row.enabled_models as Record<LuckyProvider, string>) || {}
    for (const modelId of Object.values(enabledModels)) {
      allEnabledModelIds.add(modelId)
    }
  }

  // Convert model IDs to ModelEntry objects
  const modelEntries: ModelEntry[] = []
  for (const modelId of allEnabledModelIds) {
    const entry = findModel(modelId)

    // Skip if model not found in catalog
    if (!entry) {
      console.warn(`[getUserModels] Model "${modelId}" not found in catalog - skipping`)
      continue
    }

    // Skip if provider filtering is enabled and this provider is not included
    if (!isNir(onlyIncludeProviders) && !onlyIncludeProviders.includes(entry.provider)) {
      console.warn(
        `[getUserModels] Model "${modelId}" provider "${entry.provider}" not in allowed providers - skipping`,
      )
      continue
    }

    // Only include runtime-enabled models
    if (entry.runtimeEnabled) {
      modelEntries.push(entry)
    } else {
      console.warn(`[getUserModels] Model "${modelId}" is disabled at runtime - skipping`)
    }
  }

  if (isNir(modelEntries)) {
    throw new NoEnabledModelsError(`[getUserModels] No enabled models found for user "${clerkId}"`)
  }

  return modelEntries
}
