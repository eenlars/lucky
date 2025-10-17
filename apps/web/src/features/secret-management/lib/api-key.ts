import type { SupabaseClient } from "@supabase/supabase-js"
import { generateApiKey, hashSecret } from "./api-key-utils"

export async function getActiveApiKeyMetadata(supabase: SupabaseClient, userId: string) {
  return supabase
    .schema("lockbox")
    .from("secret_keys")
    .select("key_id, name, environment, scopes, created_at, last_used_at, expires_at")
    .eq("clerk_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
}

export async function generateNewApiKey(supabase: SupabaseClient, userId: string) {
  // Check if user already has an active key
  const { data: existing, error: checkError } = await supabase
    .schema("lockbox")
    .from("secret_keys")
    .select("secret_id")
    .eq("clerk_id", userId)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle()

  if (checkError) {
    throw new Error(`Failed to check existing key: ${checkError.message}`)
  }

  if (existing) {
    throw new Error("You already have an active API key. Use the roll endpoint to generate a new one.")
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
    throw new Error(`Failed to create API key: ${error.message}`)
  }

  return { fullKey, createdAt: data.created_at }
}

export async function rollApiKey(supabase: SupabaseClient, userId: string) {
  // Revoke all existing active keys
  const { error: revokeError } = await supabase
    .schema("lockbox")
    .from("secret_keys")
    .update({ revoked_at: new Date().toISOString(), updated_by: userId })
    .eq("clerk_id", userId)
    .is("revoked_at", null)

  if (revokeError && revokeError.code !== "PGRST116") {
    // PGRST116 = no rows updated
    throw new Error(`Failed to revoke old keys: ${revokeError.message}`)
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
    throw new Error(`Failed to create new API key: ${error.message}`)
  }

  return { fullKey, createdAt: data.created_at }
}
