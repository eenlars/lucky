import { requireAuth } from "@/lib/api-auth"
import { alrighty, fail } from "@/lib/api/server"
import { generateApiKey, hashSecret } from "@/lib/api-key-utils"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// POST /api/user/api-key/roll
// Revokes the current API key and generates a new one
export async function POST(_req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()

  try {
    // Revoke all existing active keys
    const { error: revokeError } = await supabase
      .schema("lockbox")
      .from("secret_keys")
      .update({ revoked_at: new Date().toISOString(), updated_by: clerkId })
      .eq("clerk_id", clerkId)
      .is("revoked_at", null)

    if (revokeError && revokeError.code !== "PGRST116") {
      // PGRST116 = no rows updated
      return fail("user/api-key/roll", `Failed to revoke old keys: ${revokeError.message}`, {
        code: "DATABASE_ERROR",
        status: 500
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
          clerk_id: clerkId,
          key_id: keyId,
          secret_hash: secretHash,
          name: "Default API Key",
          environment: "live",
          scopes: { all: true },
          created_by: clerkId,
          updated_by: clerkId,
        } as any,
      ])
      .select("secret_id, key_id, created_at")
      .single()

    if (error) {
      return fail("user/api-key/roll", `Failed to create new API key: ${error.message}`, {
        code: "DATABASE_ERROR",
        status: 500
      })
    }

    // Return the full key ONLY this one time
    return alrighty("user/api-key/roll", {
      success: true,
      data: {
        apiKey: fullKey,
        createdAt: data.created_at
      },
      error: null
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/user/api-key/roll",
    })
    return fail("user/api-key/roll", e?.message ?? "Failed to roll API key", {
      code: "INTERNAL_ERROR",
      status: 500
    })
  }
}
