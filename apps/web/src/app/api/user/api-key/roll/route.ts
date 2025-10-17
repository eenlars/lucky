import { generateApiKey, hashSecret } from "@/lib/api-key-utils"
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
    // Revoke all existing active keys
    const { error: revokeError } = await supabase
      .schema("lockbox")
      .from("secret_keys")
      .update({ revoked_at: new Date().toISOString(), updated_by: userId })
      .eq("clerk_id", userId)
      .is("revoked_at", null)

    if (revokeError && revokeError.code !== "PGRST116") {
      // PGRST116 = no rows updated
      return fail("user/api-key/roll", `Failed to revoke old keys: ${revokeError.message}`, {
        code: "DATABASE_ERROR",
        status: 500,
      })
    }

    // Generate new API key
    const { keyId, secret, fullKey } = generateApiKey()
    const secretHash = hashSecret(secret)

    // Insert new key
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
      return fail("user/api-key/roll", `Failed to create new API key: ${error.message}`, {
        code: "DATABASE_ERROR",
        status: 500,
      })
    }

    // Return the full key ONLY this one time
    return alrighty("user/api-key/roll", {
      success: true,
      data: {
        apiKey: fullKey,
        createdAt: data.created_at,
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
