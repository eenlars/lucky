import { generateNewApiKey } from "@/features/secret-management/lib/api-key"
import { alrighty, fail } from "@/lib/api/server"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// POST /api/user/api-key/generate
// Generates a new API key for the user
export async function POST(_req: NextRequest) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createRLSClient()

  try {
    const { fullKey, createdAt } = await generateNewApiKey(supabase, userId)

    // Return the full key ONLY this one time
    return alrighty("user/api-key/generate", {
      success: true,
      data: {
        apiKey: fullKey,
        createdAt,
      },
      error: null,
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/user/api-key/generate",
    })
    const message = e?.message ?? "Failed to generate API key"
    const code = message.includes("already have an active") ? "ALREADY_EXISTS" : "INTERNAL_ERROR"
    const status = code === "ALREADY_EXISTS" ? 400 : 500
    return fail("user/api-key/generate", message, {
      code,
      status,
    })
  }
}
