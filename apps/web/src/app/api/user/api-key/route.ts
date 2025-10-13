import { requireAuth } from "@/lib/api-auth"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// GET /api/user/api-key
// Returns the user's active API key metadata (not the secret itself)
export async function GET(_req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()

  try {
    const { data, error } = await supabase
      .schema("lockbox")
      .from("secret_keys")
      .select("key_id, name, environment, scopes, created_at, last_used_at, expires_at")
      .eq("clerk_id", clerkId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("[GET /api/user/api-key] Supabase error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        clerkId,
      })
      return NextResponse.json({ error: `Failed to fetch API key: ${error.message}` }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ apiKey: null }, { status: 200 })
    }

    // Return the key_id as the displayable API key
    return NextResponse.json({
      apiKey: data.key_id,
      metadata: {
        name: data.name,
        environment: data.environment,
        scopes: data.scopes,
        createdAt: data.created_at,
        lastUsedAt: data.last_used_at,
        expiresAt: data.expires_at,
      },
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/user/api-key",
    })
    return NextResponse.json({ error: e?.message ?? "Failed to fetch API key" }, { status: 500 })
  }
}
