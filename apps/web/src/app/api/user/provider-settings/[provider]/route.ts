import { requireAuth } from "@/lib/api-auth"
import { createRLSClient } from "@/lib/supabase/server-rls"
import type { LuckyProvider } from "@lucky/shared"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// GET /api/user/provider-settings/[provider]
// Returns settings for a specific provider
export async function GET(_req: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const { provider } = await params

  // Validate provider
  const validProviders: LuckyProvider[] = ["openai", "openrouter", "groq"]
  if (!validProviders.includes(provider as LuckyProvider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 })
  }

  const supabase = await createRLSClient()

  try {
    const { data, error } = await supabase
      .schema("app")
      .from("provider_settings")
      .select("provider_setting_id, provider, enabled_models, is_enabled, created_at, updated_at")
      .eq("clerk_id", clerkId)
      .eq("provider", provider)
      .maybeSingle()

    if (error) {
      console.error(`[GET /api/user/provider-settings/${provider}] Supabase error:`, error)
      return NextResponse.json({ error: `Failed to fetch provider settings: ${error.message}` }, { status: 500 })
    }

    if (!data) {
      // Return default settings if not found
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
