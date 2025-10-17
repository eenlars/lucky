import type { Principal } from "@/lib/auth/principal"
import { createScopedClient } from "@/lib/data/scoped-client"

export async function fetchSecret(clerkId: string, name: string, namespace: string, principal?: Principal) {
  const scoped = await createScopedClient(principal)

  console.log(`[secret-repository] Fetch single secret via ${scoped.mode} client`)

  const query = scoped.client
    .schema("lockbox")
    .from("user_secrets")
    .select("ciphertext, iv, auth_tag, user_secret_id")
    .eq("name", name)
    .eq("namespace", namespace)
    .eq("is_current", true)
    .is("deleted_at", null)

  return query.eq("clerk_id", clerkId).maybeSingle()
}

export async function fetchSecrets(clerkId: string, names: string[], namespace: string, principal?: Principal) {
  const scoped = await createScopedClient(principal)

  console.log(`[secret-repository] Fetch ${names.length} secret(s) via ${scoped.mode} client`)

  return scoped.client
    .schema("lockbox")
    .from("user_secrets")
    .select("name, ciphertext, iv, auth_tag, user_secret_id")
    .in("name", names)
    .eq("namespace", namespace)
    .eq("is_current", true)
    .is("deleted_at", null)
    .eq("clerk_id", clerkId)
}

export async function touchSecrets(clerkId: string, secretIds: string[], principal?: Principal) {
  if (secretIds.length === 0) return

  const scoped = await createScopedClient(principal)
  const updatedAt = new Date().toISOString()

  await scoped.client
    .schema("lockbox")
    .from("user_secrets")
    .update({ last_used_at: updatedAt })
    .in("user_secret_id", secretIds)
    .eq("clerk_id", clerkId)
}
