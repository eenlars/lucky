import { decryptGCM, encryptGCM, normalizeNamespace } from "@/features/secret-management/lib/lockbox"
import { alrighty, fail, handleBody, isHandleBodyError } from "@/lib/api/server"
import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

// POST /api/lockbox/secrets
// Body: { name: string, namespace?: string, value: string }
// Creates a new version (rotate) and marks it as current. Never returns plaintext back.
export async function POST(req: NextRequest) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createRLSClient()

  const body = await handleBody("lockbox/secrets", req)
  if (isHandleBodyError(body)) return body

  const { name, namespace, value } = body as {
    name?: string
    namespace?: string
    value?: string
  }
  if (!name || !value) {
    return fail("lockbox/secrets", "Missing required fields: name, value", {
      code: "MISSING_FIELDS",
      status: 400,
    })
  }
  const ns = normalizeNamespace(namespace)

  try {
    const { ciphertext, iv, authTag } = encryptGCM(value)

    // Determine next version
    const { data: verData, error: verErr } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .select("version")
      .eq("clerk_id", userId)
      .eq("namespace", ns)
      .ilike("name", name)
      .order("version", { ascending: false })
      .limit(1)

    if (verErr)
      return fail("lockbox/secrets", `Version lookup failed: ${verErr.message}`, {
        code: "VERSION_LOOKUP_ERROR",
        status: 500,
      })
    const nextVersion = (verData?.[0]?.version ?? 0) + 1

    // Mark previous current as not current
    const { error: updErr } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .update({ is_current: false })
      .eq("clerk_id", userId)
      .eq("namespace", ns)
      .ilike("name", name)
      .eq("is_current", true)

    if (updErr && updErr.code !== "PGRST116") {
      // PGRST116 = no rows updated
      return fail("lockbox/secrets", `Failed to update previous versions: ${updErr.message}`, {
        code: "UPDATE_ERROR",
        status: 500,
      })
    }

    // Insert new version (current)
    const { data, error } = await supabase
      .schema("lockbox")
      .from("user_secrets")
      .insert([
        {
          clerk_id: userId,
          name,
          namespace: ns,
          version: nextVersion,
          ciphertext,
          iv,
          auth_tag: authTag,
          is_current: true,
          created_by: userId,
          updated_by: userId,
        } as any,
      ])
      .select("user_secret_id, name, namespace, version, created_at")
      .single()

    if (error)
      return fail("lockbox/secrets", `Insert failed: ${error.message}`, {
        code: "INSERT_ERROR",
        status: 500,
      })

    return alrighty("lockbox/secrets", {
      success: true,
      data: {
        id: data.user_secret_id,
        name: data.name,
        namespace: data.namespace,
        version: data.version,
        createdAt: data.created_at,
      },
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/lockbox/secrets/POST",
    })
    const message = e?.message ?? "Encryption/insert error"
    return fail("lockbox/secrets", message, { code: "ENCRYPTION_ERROR", status: 500 })
  }
}

// GET /api/lockbox/secrets?name=...&namespace=...&reveal=0|1
// By default, returns metadata only. If reveal=1, returns plaintext value and updates last_used_at.
export async function GET(req: NextRequest) {
  const { isAuthenticated, userId } = await auth()
  if (!isAuthenticated) return new NextResponse("Unauthorized", { status: 401 })

  const supabase = await createRLSClient()
  const params = req.nextUrl.searchParams
  const name = params.get("name")
  const ns = normalizeNamespace(params.get("namespace"))
  const reveal = params.get("reveal") === "1"

  if (!name) return fail("lockbox/secrets:get", "Missing name", { code: "MISSING_NAME", status: 400 })

  const { data, error } = await supabase
    .schema("lockbox")
    .from("user_secrets")
    .select("user_secret_id, name, namespace, version, ciphertext, iv, auth_tag, last_used_at, created_at")
    .eq("clerk_id", userId)
    .eq("namespace", ns)
    .ilike("name", name)
    .eq("is_current", true)
    .maybeSingle()

  if (error)
    return fail("lockbox/secrets:get", `Query failed: ${error.message}`, {
      code: "QUERY_ERROR",
      status: 500,
    })
  if (!data) return fail("lockbox/secrets:get", "Secret not found", { code: "NOT_FOUND", status: 404 })

  if (!reveal) {
    return alrighty("lockbox/secrets:get", {
      success: true,
      data: {
        id: data.user_secret_id,
        name: data.name,
        namespace: data.namespace,
        version: data.version,
        lastUsedAt: data.last_used_at ?? undefined,
        createdAt: data.created_at,
      },
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

    return alrighty("lockbox/secrets:get", {
      success: true,
      data: {
        id: data.user_secret_id,
        name: data.name,
        namespace: data.namespace,
        version: data.version,
        value,
      },
    })
  } catch (e: any) {
    logException(e, {
      location: "/api/lockbox/secrets/GET",
    })
    const message = e?.message ?? "Decryption failed"
    return fail("lockbox/secrets:get", message, { code: "DECRYPTION_ERROR", status: 500 })
  }
}
