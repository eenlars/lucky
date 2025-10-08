import { requireAuth } from "@/lib/api-auth"
import { decryptGCM, encryptGCM } from "@/lib/crypto/lockbox"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

const ENV_NAMESPACE = "environment-variables"

// GET /api/user/env-keys
// Returns list of all environment variable names and metadata (not values)
export async function GET(_req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()

  try {
    const { data, error } = await supabase
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
      return NextResponse.json({ error: `Failed to fetch environment keys: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      keys: data.map(row => ({
        id: row.user_secret_id,
        name: row.name,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to fetch environment keys" }, { status: 500 })
  }
}

// POST /api/user/env-keys
// Body: { name: string, value: string }
// Creates or updates an environment variable
export async function POST(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { name, value } = (body ?? {}) as { name?: string; value?: string }
  if (!name || !value) {
    return NextResponse.json({ error: "Missing required fields: name, value" }, { status: 400 })
  }

  // Validate name (alphanumeric, underscore, max 128 chars)
  if (!/^[A-Z0-9_]+$/i.test(name) || name.length > 128) {
    return NextResponse.json(
      { error: "Invalid name: must be alphanumeric/underscore, max 128 characters" },
      { status: 400 },
    )
  }

  try {
    // Encrypt the value
    const { ciphertext, iv, authTag } = encryptGCM(value)

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
    const { data, error } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .insert([
        {
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
        } as any,
      ])
      .select("user_secret_id, name, created_at")
      .single()

    if (error) {
      console.error("[POST /api/user/env-keys] Insert error:", error)
      return NextResponse.json({ error: `Failed to save environment key: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      id: data.user_secret_id,
      name: data.name,
      createdAt: data.created_at,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to save environment key" }, { status: 500 })
  }
}

// DELETE /api/user/env-keys?name=VARIABLE_NAME
// Soft-deletes an environment variable
export async function DELETE(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()
  const name = req.nextUrl.searchParams.get("name")

  if (!name) {
    return NextResponse.json({ error: "Missing required parameter: name" }, { status: 400 })
  }

  try {
    const { error } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .update({ deleted_at: new Date().toISOString(), is_current: false, updated_by: clerkId })
      .eq("clerk_id", clerkId)
      .eq("namespace", ENV_NAMESPACE)
      .ilike("name", name)
      .is("deleted_at", null)

    if (error) {
      console.error("[DELETE /api/user/env-keys] Delete error:", error)
      return NextResponse.json({ error: `Failed to delete environment key: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to delete environment key" }, { status: 500 })
  }
}
