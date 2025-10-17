import type { SupabaseClient } from "@supabase/supabase-js"
import { decryptGCM, encryptGCM } from "./lockbox"

const ENV_NAMESPACE = "environment-variables"

export async function listEnvKeys(supabase: SupabaseClient, userId: string) {
  return supabase
    .schema("lockbox")
    .from("user_secrets")
    .select("user_secret_id, name, created_at, last_used_at")
    .eq("clerk_id", userId)
    .eq("namespace", ENV_NAMESPACE)
    .eq("is_current", true)
    .is("deleted_at", null)
    .order("name", { ascending: true })
}

export async function createOrUpdateEnvKey(supabase: SupabaseClient, userId: string, name: string, value: string) {
  // Validate name (alphanumeric, underscore, max 128 chars)
  if (!/^[A-Z0-9_]+$/i.test(name) || name.length > 128) {
    throw new Error("Invalid name: must be alphanumeric/underscore, max 128 characters")
  }

  // Encrypt the value
  const { ciphertext, iv, authTag } = encryptGCM(value)

  // Log encryption output for debugging
  console.log("[env-keys] Encryption output:")
  console.log("  ciphertext length (with \\x prefix):", ciphertext.length)
  console.log("  iv length (with \\x prefix):", iv.length)
  console.log("  authTag length (with \\x prefix):", authTag.length)

  // Validate auth_tag is exactly 16 bytes
  const stripPrefix = (s: string) => (s.startsWith("\\x") ? s.slice(2) : s)
  const authTagBytes = Buffer.from(stripPrefix(authTag), "hex")
  const ivBytes = Buffer.from(stripPrefix(iv), "hex")

  console.log("  authTag decoded byte length:", authTagBytes.length)
  console.log("  iv decoded byte length:", ivBytes.length)

  if (authTagBytes.length !== 16) {
    console.error(`[env-keys] Invalid auth_tag length: ${authTagBytes.length} bytes (expected 16)`)
    throw new Error(`Encryption error: auth_tag is ${authTagBytes.length} bytes, expected 16`)
  }

  // Check for existing variable
  const { data: existing } = await supabase
    .schema("lockbox")
    .from("user_secrets")
    .select("version")
    .eq("clerk_id", userId)
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
      .eq("clerk_id", userId)
      .eq("namespace", ENV_NAMESPACE)
      .ilike("name", name)
      .eq("is_current", true)
  }

  // Insert new version
  const insertPayload = {
    clerk_id: userId,
    name,
    namespace: ENV_NAMESPACE,
    version: nextVersion,
    ciphertext,
    iv,
    auth_tag: authTag,
    is_current: true,
    created_by: userId,
    updated_by: userId,
  }

  console.log("[env-keys] About to insert:")
  console.log("  clerk_id:", userId)
  console.log("  name:", name)
  console.log("  namespace:", ENV_NAMESPACE)
  console.log("  version:", nextVersion)
  console.log("  auth_tag type:", typeof authTag)
  console.log("  auth_tag value (first 20 chars):", authTag.substring(0, 20))

  const { error } = await supabase
    .schema("lockbox")
    .from("user_secrets")
    .insert([insertPayload as any])
    .select("user_secret_id, name, created_at")
    .single()

  if (error) {
    console.error("[env-keys] Insert error:", error)
    console.error("[env-keys] Error details:", JSON.stringify(error, null, 2))
    throw new Error(`Failed to save environment key: ${error.message}`)
  }

  return { updated: true }
}

export async function deleteEnvKey(supabase: SupabaseClient, userId: string, name: string) {
  const { error } = await supabase
    .schema("lockbox")
    .from("user_secrets")
    .update({
      deleted_at: new Date().toISOString(),
      is_current: false,
      updated_by: userId,
    })
    .eq("clerk_id", userId)
    .eq("namespace", ENV_NAMESPACE)
    .ilike("name", name)
    .is("deleted_at", null)

  if (error) {
    throw new Error(`Failed to delete environment key: ${error.message}`)
  }

  return { success: true }
}

export async function getEnvKeyByName(supabase: SupabaseClient, userId: string, name: string) {
  return supabase
    .schema("lockbox")
    .from("user_secrets")
    .select("user_secret_id, name, ciphertext, iv, auth_tag, created_at")
    .eq("clerk_id", userId)
    .eq("namespace", ENV_NAMESPACE)
    .ilike("name", name)
    .eq("is_current", true)
    .is("deleted_at", null)
    .maybeSingle()
}

export async function updateEnvKeyLastUsed(supabase: SupabaseClient, secretId: string) {
  return supabase
    .schema("lockbox")
    .from("user_secrets")
    .update({ last_used_at: new Date().toISOString() })
    .eq("user_secret_id", secretId)
}

export function decryptEnvKey(ciphertext: any, iv: any, authTag: any): string {
  return decryptGCM({
    ciphertext,
    iv,
    authTag,
  })
}
