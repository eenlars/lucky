import { requireAuth } from "@/lib/api-auth"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

/**
 * @deprecated Use /api/user/model-preferences instead
 * This endpoint remains for backwards compatibility only.
 * Will be removed in a future version.
 */

// GET /api/user/provider-settings/[provider]
// Returns provider settings for a specific provider
export async function GET(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const { provider } = await params
  const supabase = await createRLSClient()

  try {
    const { data, error } = await supabase
      .schema("app")
      .from("provider_settings")
      .select("provider_setting_id, provider, enabled_models, is_enabled, created_at, updated_at")
      .eq("clerk_id", clerkId)
      .eq("provider", provider.toLowerCase())
      .maybeSingle()

    if (error) {
      console.error(`[GET /api/user/provider-settings/${provider}] Supabase error:`, error)
      return NextResponse.json({ error: `Failed to fetch provider settings: ${error.message}` }, { status: 500 })
    }

    // If no settings found, return empty enabled models
    if (!data) {
      return NextResponse.json({
        provider,
        enabledModels: [],
        isEnabled: false,
      })
    }

    return NextResponse.json({
      id: data.provider_setting_id,
      provider: data.provider,
      enabledModels: data.enabled_models as string[],
      isEnabled: data.is_enabled,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to fetch provider settings"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
