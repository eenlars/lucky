import { decryptGCM, normalizeNamespace } from "@/lib/crypto/lockbox"
import { createRLSClient } from "@/lib/supabase/server-rls"

export type SecretResolver = {
  get(name: string, namespace?: string): Promise<string | undefined>
  getAll(names: string[], namespace?: string): Promise<Record<string, string>>
}

export function createSecretResolver(clerk_id: string): SecretResolver {
  return {
    async get(name: string, namespace?: string): Promise<string | undefined> {
      const ns = normalizeNamespace(namespace)
      const supabase = await createRLSClient()

      const { data, error } = await supabase
        .schema("lockbox")
        .from("user_secrets")
        .select("ciphertext, iv, auth_tag, user_secret_id")
        .eq("clerk_id", clerk_id)
        .eq("name", name)
        .eq("namespace", ns)
        .eq("is_current", true)
        .is("deleted_at", null)
        .maybeSingle()

      if (error || !data) {
        return undefined
      }

      // Update last_used_at
      await supabase
        .schema("lockbox")
        .from("user_secrets")
        .update({ last_used_at: new Date().toISOString() })
        .eq("user_secret_id", data.user_secret_id)

      return decryptGCM({
        ciphertext: data.ciphertext as any,
        iv: data.iv as any,
        authTag: data.auth_tag as any,
      })
    },

    async getAll(names: string[], namespace?: string): Promise<Record<string, string>> {
      const ns = normalizeNamespace(namespace)
      const supabase = await createRLSClient()

      const { data, error } = await supabase
        .schema("lockbox")
        .from("user_secrets")
        .select("name, ciphertext, iv, auth_tag, user_secret_id")
        .eq("clerk_id", clerk_id)
        .in("name", names)
        .eq("namespace", ns)
        .eq("is_current", true)
        .is("deleted_at", null)

      if (error || !data) {
        return {}
      }

      const secrets: Record<string, string> = {}
      const secretIds: string[] = []

      for (const row of data) {
        try {
          const plaintext = decryptGCM({
            ciphertext: row.ciphertext as any,
            iv: row.iv as any,
            authTag: row.auth_tag as any,
          })
          secrets[row.name] = plaintext
          secretIds.push(row.user_secret_id)
        } catch (e) {
          console.error(`Failed to decrypt secret ${row.name}:`, e)
        }
      }

      // Update last_used_at for all fetched secrets
      if (secretIds.length > 0) {
        await supabase
          .schema("lockbox")
          .from("user_secrets")
          .update({ last_used_at: new Date().toISOString() })
          .in("user_secret_id", secretIds)
      }

      return secrets
    },
  }
}
