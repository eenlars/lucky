/**
 * Unified Model Preferences API
 * Returns all provider settings with Zod validation
 */

import { requireAuth } from "@/lib/api-auth"
import { checkMultipleProviderKeys } from "@/lib/lockbox/check-provider-keys"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { getAllProviders } from "@lucky/models"
import type { ModelId, UserModelPreferences } from "@lucky/shared"
import { userModelPreferencesSchema } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * GET /api/user/model-preferences
 * Returns ALL provider settings with normalized and validated model IDs
 */
export async function GET(_req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()

  try {
    const { data, error } = await supabase
      .schema("app")
      .from("provider_settings")
      .select("provider, enabled_models, is_enabled, updated_at")
      .eq("clerk_id", clerkId)
      .order("provider", { ascending: true })

    if (error) {
      console.error("[GET /api/user/model-preferences] Supabase error:", error)
      return NextResponse.json({ error: `Failed to fetch preferences: ${error.message}` }, { status: 500 })
    }

    // Create map of available providers for validation
    const validProviders = new Set(getAllProviders())

    // Filter to valid providers
    const validData = data.filter(row => validProviders.has(row.provider))

    // Check API key status for all providers in parallel
    const providerNames = validData.map(row => row.provider)
    const keyStatusMap = await checkMultipleProviderKeys(clerkId, providerNames)

    // Build provider settings - use model IDs as-is from database
    const providers = validData.map(row => {
      // IMPORTANT: Do NOT normalize model IDs!
      // OpenAI expects "gpt-5-nano", OpenRouter expects "openai/gpt-5-nano"
      // The database stores whatever format the provider's API expects
      // The MODEL_CATALOG's `model` field shows the correct format for each provider
      const enabledModels = (row.enabled_models as string[]) || []

      // Convert timestamp to ISO format
      const lastUpdated = row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()

      return {
        provider: row.provider,
        enabledModels,
        isEnabled: row.is_enabled,
        metadata: {
          apiKeyConfigured: keyStatusMap.get(row.provider) ?? false,
          lastUpdated,
        },
      }
    })

    // Build UserModelPreferences response
    const preferences: UserModelPreferences = {
      providers,
      lastSynced: new Date().toISOString(),
    }

    // Validate with Zod
    const validated = userModelPreferencesSchema.parse(preferences)

    return NextResponse.json(validated)
  } catch (e: unknown) {
    console.error("[GET /api/user/model-preferences] Error:", e)
    const message = e instanceof Error ? e.message : "Failed to fetch preferences"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PUT /api/user/model-preferences
 * Updates all provider settings atomically
 * Body: UserModelPreferences
 */
export async function PUT(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  // Validate with Zod
  const validation = userModelPreferencesSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Invalid preferences format",
        details: validation.error.errors,
      },
      { status: 400 },
    )
  }

  const preferences = validation.data
  const validProviders = new Set(getAllProviders())

  try {
    // Validate providers (but not models - provider API is source of truth)
    for (const providerSettings of preferences.providers) {
      if (!validProviders.has(providerSettings.provider)) {
        return NextResponse.json(
          {
            error: `Invalid provider: ${providerSettings.provider}`,
            validProviders: Array.from(validProviders),
          },
          { status: 400 },
        )
      }

      // Note: We don't validate models against MODEL_CATALOG because the provider's API
      // is the source of truth. Our catalog is just for enrichment with pricing/metadata.
    }

    // Update each provider's settings
    const updatePromises = preferences.providers.map(async providerSettings => {
      // Check if settings exist
      const { data: existing } = await supabase
        .schema("app")
        .from("provider_settings")
        .select("provider_setting_id")
        .eq("clerk_id", clerkId)
        .eq("provider", providerSettings.provider)
        .maybeSingle()

      if (existing) {
        // Update existing
        return supabase
          .schema("app")
          .from("provider_settings")
          .update({
            enabled_models: providerSettings.enabledModels as ModelId[],
            is_enabled: providerSettings.isEnabled,
            updated_at: new Date().toISOString(),
          })
          .eq("provider_setting_id", existing.provider_setting_id)
      }
      // Insert new
      return supabase
        .schema("app")
        .from("provider_settings")
        .insert([
          {
            clerk_id: clerkId,
            provider: providerSettings.provider,
            enabled_models: providerSettings.enabledModels as ModelId[],
            is_enabled: providerSettings.isEnabled,
          },
        ])
    })

    const results = await Promise.all(updatePromises)

    // Check for errors
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error("[PUT /api/user/model-preferences] Update errors:", errors)
      return NextResponse.json(
        {
          error: "Failed to update some provider settings",
          details: errors.map(r => r.error?.message),
        },
        { status: 500 },
      )
    }

    // Return updated preferences
    const updatedPreferences: UserModelPreferences = {
      ...preferences,
      lastSynced: new Date().toISOString(),
    }

    return NextResponse.json(updatedPreferences)
  } catch (e: unknown) {
    console.error("[PUT /api/user/model-preferences] Error:", e)
    const message = e instanceof Error ? e.message : "Failed to update preferences"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
