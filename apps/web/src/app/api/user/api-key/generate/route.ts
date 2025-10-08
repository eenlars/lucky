import { requireAuth } from "@/lib/api-auth"
import { generateApiKey, hashSecret } from "@/lib/api-key-utils"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// POST /api/user/api-key/generate
// Generates a new API key for the user
export async function POST(_req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()

  try {
    // Check if user already has an active API key
    const { data: existing, error: checkError } = await supabase
      .schema("lockbox")
      .from("secret_keys")
      .select("secret_id")
      .eq("clerk_id", clerkId)
      .is("revoked_at", null)
      .limit(1)
      .maybeSingle()

    if (checkError) {
      return NextResponse.json({ error: `Failed to check existing key: ${checkError.message}` }, { status: 500 })
    }

    if (existing) {
      return NextResponse.json(
        { error: "You already have an active API key. Use the roll endpoint to generate a new one." },
        { status: 400 },
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
      return NextResponse.json({ error: `Failed to create API key: ${error.message}` }, { status: 500 })
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
    return NextResponse.json({ error: e?.message ?? "Failed to generate API key" }, { status: 500 })
  }
}
