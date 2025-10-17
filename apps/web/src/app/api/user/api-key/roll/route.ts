import { rollApiKey } from "@/features/secret-management/lib/api-key"
import { alrighty, fail } from "@/lib/api/server"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// POST /api/user/api-key/roll
// Revokes the current API key and generates a new one
export async function POST(_req: NextRequest) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createRLSClient()

  try {
    const { fullKey, createdAt } = await rollApiKey(supabase, userId)

    // Return the full key ONLY this one time
    return alrighty("user/api-key/roll", {
      success: true,
      data: {
        apiKey: fullKey,
        createdAt,
      },
      error: null,
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/user/api-key/roll",
    })
    return fail("user/api-key/roll", e?.message ?? "Failed to roll API key", {
      code: "INTERNAL_ERROR",
      status: 500,
    })
  }
}
