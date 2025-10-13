import { requireAuth } from "@/lib/api-auth"
import { decryptGCM, encryptGCM, normalizeNamespace } from "@/lib/crypto/lockbox"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// POST /api/lockbox/secrets
// Body: { name: string, namespace?: string, value: string }
// Creates a new version (rotate) and marks it as current. Never returns plaintext back.
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

  const { name, namespace, value } = (body ?? {}) as {
    name?: string
    namespace?: string
    value?: string
  }
  if (!name || !value) {
    return NextResponse.json({ error: "Missing required fields: name, value" }, { status: 400 })
  }
  const ns = normalizeNamespace(namespace)

  // Encrypt
  try {
    const { ciphertext, iv, authTag } = encryptGCM(value)

    // Determine next version
    const { data: verData, error: verErr } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .select("version")
      .eq("clerk_id", clerkId)
      .eq("namespace", ns)
      .ilike("name", name)
      .order("version", { ascending: false })
      .limit(1)

    if (verErr) return NextResponse.json({ error: `Version lookup failed: ${verErr.message}` }, { status: 500 })
    const nextVersion = (verData?.[0]?.version ?? 0) + 1

    // Mark previous current as not current
    const { error: updErr } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .update({ is_current: false })
      .eq("clerk_id", clerkId)
      .eq("namespace", ns)
      .ilike("name", name)
      .eq("is_current", true)

    if (updErr && updErr.code !== "PGRST116") {
      // PGRST116 = no rows updated
      return NextResponse.json({ error: `Failed to update previous versions: ${updErr.message}` }, { status: 500 })
    }

    // Insert new version (current)
    const { data, error } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .insert([
        {
          clerk_id: clerkId,
          name,
          namespace: ns,
          version: nextVersion,
          ciphertext,
          iv,
          auth_tag: authTag,
          is_current: true,
          created_by: clerkId,
          updated_by: clerkId,
        } as any,
      ])
      .select("user_secret_id, name, namespace, version, created_at")
      .single()

    if (error) return NextResponse.json({ error: `Insert failed: ${error.message}` }, { status: 500 })

    return NextResponse.json({
      id: data.user_secret_id,
      name: data.name,
      namespace: data.namespace,
      version: data.version,
      createdAt: data.created_at,
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/lockbox/secrets/POST",
    })
    return NextResponse.json({ error: e?.message ?? "Encryption/insert error" }, { status: 500 })
  }
}

// GET /api/lockbox/secrets?name=...&namespace=...&reveal=0|1
// By default, returns metadata only. If reveal=1, returns plaintext value and updates last_used_at.
export async function GET(req: NextRequest) {
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult
  const clerkId = authResult

  const supabase = await createRLSClient()
  const params = req.nextUrl.searchParams
  const name = params.get("name")
  const ns = normalizeNamespace(params.get("namespace"))
  const reveal = params.get("reveal") === "1"

  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 })

  const { data, error } = await supabase
    .schema("lockbox")
    .from("user_secrets")
    .select("user_secret_id, name, namespace, version, ciphertext, iv, auth_tag, last_used_at, created_at")
    .eq("clerk_id", clerkId)
    .eq("namespace", ns)
    .ilike("name", name)
    .eq("is_current", true)
    .maybeSingle()

  if (error) return NextResponse.json({ error: `Query failed: ${error.message}` }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Secret not found" }, { status: 404 })

  if (!reveal) {
    return NextResponse.json({
      id: data.user_secret_id,
      name: data.name,
      namespace: data.namespace,
      version: data.version,
      lastUsedAt: data.last_used_at,
      createdAt: data.created_at,
    })
  }

  // Reveal: decrypt server-side and return plaintext; also update last_used_at
  try {
    const value = decryptGCM({
      ciphertext: data.ciphertext as any,
      iv: data.iv as any,
      authTag: data.auth_tag as any,
    })
    const { error: updErr } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .update({ last_used_at: new Date().toISOString() })
      .eq("user_secret_id", data.user_secret_id)

    if (updErr) {
      // Do not fail reveal if metadata update fails
      console.warn("Failed to update last_used_at for secret", data.user_secret_id, updErr)
    }

    return NextResponse.json({
      id: data.user_secret_id,
      name: data.name,
      namespace: data.namespace,
      version: data.version,
      value,
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/lockbox/secrets/GET",
    })
    return NextResponse.json({ error: e?.message ?? "Decryption failed" }, { status: 500 })
  }
}
