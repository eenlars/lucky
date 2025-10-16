import { requireAuth } from "@/lib/api-auth"
import { alrighty, fail } from "@/lib/api/server"
import { decryptGCM } from "@/lib/crypto/lockbox"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest } from "next/server"

export const runtime = "nodejs"

const ENV_NAMESPACE = "environment-variables"

// GET /api/user/env-keys/[name]
// Returns the decrypted value of a specific environment variable
export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const authResult = await requireAuth()
  if (authResult) return authResult
  const clerkId = authResult as string

  const { name } = await params

  if (!name) {
    return fail("user/env-keys/[name]", "Missing name parameter", {
      code: "MISSING_NAME",
      status: 400,
    })
  }

  const supabase = await createRLSClient()

  try {
    const { data, error } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .select("user_secret_id, name, ciphertext, iv, auth_tag, created_at")
      .eq("clerk_id", clerkId)
      .eq("namespace", ENV_NAMESPACE)
      .ilike("name", name)
      .eq("is_current", true)
      .is("deleted_at", null)
      .maybeSingle()

    if (error) {
      console.error("[GET /api/user/env-keys/[name]] Supabase error:", error)
      return fail("user/env-keys/[name]", `Failed to fetch environment key: ${error.message}`, {
        code: "SUPABASE_ERROR",
        status: 500,
      })
    }

    if (!data) {
      return fail("user/env-keys/[name]", "Environment variable not found", {
        code: "NOT_FOUND",
        status: 404,
      })
    }

    // Decrypt the value
    const value = decryptGCM({
      ciphertext: data.ciphertext as any,
      iv: data.iv as any,
      authTag: data.auth_tag as any,
    })

    // Update last_used_at
    await supabase
      .schema("lockbox")
      .from("user_secrets")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_secret_id", data.user_secret_id)

    return alrighty("user/env-keys/[name]", {
      id: data.user_secret_id,
      name: data.name,
      value,
      createdAt: data.created_at,
    })
  } catch (e: any) {
    return fail("user/env-keys/[name]", e?.message ?? "Failed to fetch environment key", {
      code: "DECRYPT_ERROR",
      status: 500,
    })
  }
}
