import { requireAuth } from "@/lib/api-auth"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { getAllProviders } from "@lucky/models"
import { providerNameSchema } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * @deprecated Use /api/user/model-preferences instead
 * This endpoint remains for backwards compatibility only.
 * Will be removed in a future version.
 */

// GET /api/user/provider-settings
// Returns all provider settings for the authenticated user
export async function GET(_req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()

  try {
    const { data, error } = await supabase
      .schema("app")
      .from("provider_settings")
      .select("provider_setting_id, provider, enabled_models, is_enabled, created_at, updated_at")
      .eq("clerk_id", clerkId)
      .order("provider", { ascending: true })

    if (error) {
      console.error("[GET /api/user/provider-settings] Supabase error:", error)
      return NextResponse.json({ error: `Failed to fetch provider settings: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      settings: data.map(row => ({
        id: row.provider_setting_id,
        provider: row.provider,
        enabledModels: row.enabled_models as string[],
        isEnabled: row.is_enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch provider settings"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/user/provider-settings
// Body: { provider: string, enabledModels: string[], isEnabled: boolean }
// Creates or updates provider settings
export async function POST(req: NextRequest) {
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

  const { provider, enabledModels, isEnabled } = body as {
    provider?: unknown
    enabledModels?: string[]
    isEnabled?: boolean
  }

  // Validate provider with Zod
  const providerValidation = providerNameSchema.safeParse(provider)
  if (!providerValidation.success) {
    return NextResponse.json(
      {
        error: "Invalid provider: must be a non-empty string",
        details: providerValidation.error.errors,
      },
      { status: 400 },
    )
  }

  const validatedProvider = providerValidation.data.trim().toLowerCase()

  // Validate provider against MODEL_CATALOG
  const validProviders = getAllProviders()
  if (!validProviders.includes(validatedProvider)) {
    return NextResponse.json(
      {
        error: `Invalid provider: "${validatedProvider}"`,
        hint: "Provider not found in model catalog",
        validProviders,
      },
      { status: 400 },
    )
  }

  try {
    // Check if settings already exist
    const { data: existing } = await supabase
      .schema("app")
      .from("provider_settings")
      .select("provider_setting_id")
      .eq("clerk_id", clerkId)
      .eq("provider", validatedProvider)
      .maybeSingle()

    if (existing) {
      // Update existing settings
      const { data, error } = await supabase
        .schema("app")
        .from("provider_settings")
        .update({
          enabled_models: enabledModels ?? [],
          is_enabled: isEnabled ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("provider_setting_id", existing.provider_setting_id)
        .select("provider_setting_id, provider, enabled_models, is_enabled, updated_at")
        .single()

      if (error) {
        console.error("[POST /api/user/provider-settings] Update error:", error)
        return NextResponse.json({ error: `Failed to update provider settings: ${error.message}` }, { status: 500 })
      }

      return NextResponse.json({
        id: data.provider_setting_id,
        provider: data.provider,
        enabledModels: data.enabled_models as string[],
        isEnabled: data.is_enabled,
        updatedAt: data.updated_at,
      })
    }

    // Create new settings
    const { data, error } = await supabase
      .schema("app")
      .from("provider_settings")
      .insert([
        {
          clerk_id: clerkId,
          provider: validatedProvider,
          enabled_models: enabledModels ?? [],
          is_enabled: isEnabled ?? true,
        },
      ])
      .select("provider_setting_id, provider, enabled_models, is_enabled, created_at")
      .single()

    if (error) {
      console.error("[POST /api/user/provider-settings] Insert error:", error)
      return NextResponse.json({ error: `Failed to create provider settings: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      id: data.provider_setting_id,
      provider: data.provider,
      enabledModels: data.enabled_models as string[],
      isEnabled: data.is_enabled,
      createdAt: data.created_at,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to save provider settings"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
