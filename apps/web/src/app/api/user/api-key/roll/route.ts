import crypto from "node:crypto"
import { requireAuth } from "@/lib/api-auth"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

function generateApiKey(): { keyId: string; secret: string; fullKey: string } {
  // Generate a random secret (32 bytes = 256 bits)
  const secretBytes = crypto.randomBytes(32)
  const secret = secretBytes.toString("base64url").replace(/[-]/g, "")

  // Create a shorter key_id for display (first 8 chars of the secret hash)
  const keyIdHash = crypto
    .createHash("sha256")
    .update(secretBytes)
    .digest("base64url")
    .substring(0, 8)
    .replace(/[-]/g, "")
  const keyId = `alive_${keyIdHash}`

  // Full key is prefix + secret
  const fullKey = `alive_${secret}`

  return { keyId, secret, fullKey }
}

function hashSecret(secret: string): string {
  // Use SHA-256 to hash the secret for storage
  return crypto.createHash("sha256").update(secret).digest("hex")
}

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
      return NextResponse.json({ error: `Failed to revoke old keys: ${revokeError.message}` }, { status: 500 })
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
      return NextResponse.json({ error: `Failed to create new API key: ${error.message}` }, { status: 500 })
    }

    // Return the full key ONLY this one time
    return NextResponse.json({
      apiKey: fullKey,
      metadata: {
        secretId: data.secret_id,
        keyId: data.key_id,
        createdAt: data.created_at,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to roll API key" }, { status: 500 })
  }
}
