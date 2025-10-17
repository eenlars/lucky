import { getActiveApiKeyMetadata } from "@/features/secret-management/lib/api-key"
import { alrighty, fail } from "@/lib/api/server"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// GET /api/user/api-key
// Returns the user's active API key metadata (not the secret itself)
export async function GET(_req: NextRequest) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createRLSClient()

  try {
    const { data, error } = await getActiveApiKeyMetadata(supabase, userId)

    if (error) {
      console.error("[GET /api/user/api-key] Supabase error:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        userId,
      })
      return fail("user/api-key", `Failed to fetch API key: ${error.message}`, {
        code: "DATABASE_ERROR",
        status: 500,
      })
    }

    if (!data) {
      return alrighty("user/api-key", {
        success: true,
        data: {
          apiKey: "",
          createdAt: "",
          expiresAt: undefined,
        },
        error: null,
      })
    }

    return alrighty("user/api-key", {
      success: true,
      data: {
        apiKey: data.key_id,
        createdAt: data.created_at,
        expiresAt: data.expires_at || undefined,
      },
      error: null,
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/user/api-key",
    })
    return fail("user/api-key", e?.message ?? "Failed to fetch API key", {
      code: "INTERNAL_ERROR",
      status: 500,
    })
  }
}
