/**
 * Unified Model Preferences API
 * Returns all provider settings with normalized model IDs and Zod validation
 */

import { requireAuth } from "@/lib/api-auth"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { MODEL_CATALOG, getAllProviders } from "@lucky/models"
import type { ModelId, UserModelPreferences } from "@lucky/shared"
import { normalizeModelId, userModelPreferencesSchema } from "@lucky/shared"
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

    // Normalize and validate model IDs against MODEL_CATALOG
    const providers = data
      .filter(row => validProviders.has(row.provider))
      .map(row => {
        const rawModels = (row.enabled_models as string[]) || []

        // Normalize model IDs to "provider/model" format
        const normalizedModels = rawModels.map(model => normalizeModelId(row.provider, model))

        // Validate against MODEL_CATALOG - only keep models that exist
        const validatedModels = normalizedModels.filter(modelId => MODEL_CATALOG.some(m => m.id === modelId))

        return {
          provider: row.provider,
          enabledModels: validatedModels,
          isEnabled: row.is_enabled,
          metadata: {
            apiKeyConfigured: true, // TODO: Check actual API key status
            lastUpdated: row.updated_at || new Date().toISOString(),
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
    // Validate all models against MODEL_CATALOG
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

      for (const modelId of providerSettings.enabledModels) {
        const catalogEntry = MODEL_CATALOG.find(m => m.id === modelId)
        if (!catalogEntry) {
          return NextResponse.json(
            {
              error: `Model not found in catalog: ${modelId}`,
            },
            { status: 400 },
          )
        }

        // Verify the model actually uses the specified provider API
        if (catalogEntry.provider !== providerSettings.provider) {
          return NextResponse.json(
            {
              error: `Model ${modelId} uses ${catalogEntry.provider} API, not ${providerSettings.provider}`,
            },
            { status: 400 },
          )
        }
      }
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
