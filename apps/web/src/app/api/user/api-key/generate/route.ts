import { generateApiKey, hashSecret } from "@/lib/api-key-utils"
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
    // Check if user already has an active API key
    const { data: existing, error: checkError } = await supabase
      .schema("lockbox")
      .from("secret_keys")
      .select("secret_id")
      .eq("clerk_id", userId)
      .is("revoked_at", null)
      .limit(1)
      .maybeSingle()

    if (checkError) {
      return fail("user/api-key/generate", `Failed to check existing key: ${checkError.message}`, {
        code: "DATABASE_ERROR",
        status: 500,
      })
    }

    if (existing) {
      return fail(
        "user/api-key/generate",
        "You already have an active API key. Use the roll endpoint to generate a new one.",
        {
          code: "ALREADY_EXISTS",
          status: 400,
        },
      )
    }

    // Generate new API key
    const { keyId, secret, fullKey } = generateApiKey()
    const secretHash = hashSecret(secret)

    // Insert into database
    const { data, error } = await supabase
      .schema("lockbox")
      .from("secret_keys")
      .insert([
        {
          clerk_id: userId,
          key_id: keyId,
          secret_hash: secretHash,
          name: "Default API Key",
          environment: "live",
          scopes: { all: true },
          created_by: userId,
          updated_by: userId,
        } as any,
      ])
      .select("secret_id, key_id, created_at")
      .single()

    if (error) {
      return fail("user/api-key/generate", `Failed to create API key: ${error.message}`, {
        code: "DATABASE_ERROR",
        status: 500,
      })
    }

    // Return the full key ONLY this one time
    return alrighty("user/api-key/generate", {
      success: true,
      data: {
        apiKey: fullKey,
        createdAt: data.created_at,
      },
      error: null,
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/user/api-key/generate",
    })
    return fail("user/api-key/generate", e?.message ?? "Failed to generate API key", {
      code: "INTERNAL_ERROR",
      status: 500,
    })
  }
}
