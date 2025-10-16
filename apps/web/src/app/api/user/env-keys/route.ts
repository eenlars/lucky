import { requireAuth } from "@/lib/api-auth"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { encryptGCM } from "@/lib/crypto/lockbox"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest } from "next/server"

export const runtime = "nodejs"

const ENV_NAMESPACE = "environment-variables"

// GET /api/user/env-keys
// Returns list of all environment variable names and metadata (not values)
export async function GET(_req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult) return authResult
  const clerkId = authResult as string

  const supabase = await createRLSClient()

  try {
    const { data, error} = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .select("user_secret_id, name, created_at, last_used_at")
      .eq("clerk_id", clerkId)
      .eq("namespace", ENV_NAMESPACE)
      .eq("is_current", true)
      .is("deleted_at", null)
      .order("name", { ascending: true })

    if (error) {
      console.error("[GET /api/user/env-keys] Supabase error:", error)
      return fail("user/env-keys", `Failed to fetch environment keys: ${error.message}`, {
        code: "DATABASE_ERROR",
        status: 500
      })
    }

    const keys = data.map(row => ({
      id: row.user_secret_id,
      name: row.name,
      createdAt: row.created_at,
    }))

    return alrighty("user/env-keys", {
      success: true,
      data: keys,
      error: null
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/user/env-keys/GET",
    })
    return fail("user/env-keys", e?.message ?? "Failed to fetch environment keys", {
      code: "INTERNAL_ERROR",
      status: 500
    })
  }
}

// POST /api/user/env-keys
// Body: { key: string, value: string }
// Creates or updates an environment variable
export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult) return authResult
  const clerkId = authResult as string

  const supabase = await createRLSClient()

  const body = await handleBody("user/env-keys/set", req)
  if (isHandleBodyError(body)) return body

  const { key: name, value } = body

  // Validate name (alphanumeric, underscore, max 128 chars) - additional validation beyond Zod
  if (!/^[A-Z0-9_]+$/i.test(name) || name.length > 128) {
    return fail("user/env-keys/set", "Invalid name: must be alphanumeric/underscore, max 128 characters", {
      code: "VALIDATION_ERROR",
      status: 400
    })
  }

  try {
    // Encrypt the value
    const { ciphertext, iv, authTag } = encryptGCM(value)

    // Log encryption output for debugging
    console.log("[POST /api/user/env-keys] Encryption output:")
    console.log("  ciphertext length (with \\x prefix):", ciphertext.length)
    console.log("  iv length (with \\x prefix):", iv.length)
    console.log("  authTag length (with \\x prefix):", authTag.length)

    // Strip \x prefix and decode hex
    const stripPrefix = (s: string) => (s.startsWith("\\x") ? s.slice(2) : s)
    const authTagBytes = Buffer.from(stripPrefix(authTag), "hex")
    const ivBytes = Buffer.from(stripPrefix(iv), "hex")

    console.log("  authTag decoded byte length:", authTagBytes.length)
    console.log("  iv decoded byte length:", ivBytes.length)

    // Validate auth_tag is exactly 16 bytes
    if (authTagBytes.length !== 16) {
      console.error(`[POST /api/user/env-keys] Invalid auth_tag length: ${authTagBytes.length} bytes (expected 16)`)
      return fail(
        "user/env-keys/set",
        `Encryption error: auth_tag is ${authTagBytes.length} bytes, expected 16`,
        { code: "ENCRYPTION_ERROR", status: 500 },
      )
    }

    // Check for existing variable
    const { data: existing } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .select("version")
      .eq("clerk_id", clerkId)
      .eq("namespace", ENV_NAMESPACE)
      .ilike("name", name)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextVersion = (existing?.version ?? 0) + 1

    // Mark previous versions as not current
    if (existing) {
      await supabase
        .schema("lockbox")
        .from("user_secrets")
        .update({ is_current: false })
        .eq("clerk_id", clerkId)
        .eq("namespace", ENV_NAMESPACE)
        .ilike("name", name)
        .eq("is_current", true)
    }

    // Insert new version
    const insertPayload = {
      clerk_id: clerkId,
      name,
      namespace: ENV_NAMESPACE,
      version: nextVersion,
      ciphertext,
      iv,
      auth_tag: authTag,
      is_current: true,
      created_by: clerkId,
      updated_by: clerkId,
    }

    console.log("[POST /api/user/env-keys] About to insert:")
    console.log("  clerk_id:", clerkId)
    console.log("  name:", name)
    console.log("  namespace:", ENV_NAMESPACE)
    console.log("  version:", nextVersion)
    console.log("  auth_tag type:", typeof authTag)
    console.log("  auth_tag value (first 20 chars):", authTag.substring(0, 20))

    const { data, error } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .insert([insertPayload as any])
      .select("user_secret_id, name, created_at")
      .single()

    if (error) {
      console.error("[POST /api/user/env-keys] Insert error:", error)
      console.error("[POST /api/user/env-keys] Error details:", JSON.stringify(error, null, 2))
      return fail("user/env-keys/set", `Failed to save environment key: ${error.message}`, {
        code: "DATABASE_ERROR",
        status: 500
      })
    }

    return alrighty("user/env-keys/set", {
      success: true,
      data: { updated: true },
      error: null
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/user/env-keys/POST",
    })
    return fail("user/env-keys/set", e?.message ?? "Failed to save environment key", {
      code: "INTERNAL_ERROR",
      status: 500
    })
  }
}

// DELETE /api/user/env-keys?name=VARIABLE_NAME
// Soft-deletes an environment variable
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult) return authResult
  const clerkId = authResult as string

  const supabase = await createRLSClient()
  const name = req.nextUrl.searchParams.get("name")

  if (!name) {
    return fail("user/env-keys/[name]", "Missing required parameter: name", {
      code: "MISSING_PARAMETER",
      status: 400
    })
  }

  try {
    const { error } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .update({
        deleted_at: new Date().toISOString(),
        is_current: false,
        updated_by: clerkId,
      })
      .eq("clerk_id", clerkId)
      .eq("namespace", ENV_NAMESPACE)
      .ilike("name", name)
      .is("deleted_at", null)

    if (error) {
      console.error("[DELETE /api/user/env-keys] Delete error:", error)
      return fail("user/env-keys/[name]", `Failed to delete environment key: ${error.message}`, {
        code: "DATABASE_ERROR",
        status: 500
      })
    }

    return alrighty("user/env-keys", {
      success: true,
      data: [],
      error: null
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/user/env-keys/DELETE",
    })
    return fail("user/env-keys/[name]", e?.message ?? "Failed to delete environment key", {
      code: "INTERNAL_ERROR",
      status: 500
    })
  }
}
