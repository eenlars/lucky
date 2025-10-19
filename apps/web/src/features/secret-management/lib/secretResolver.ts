import type { Principal } from "@/lib/auth/principal"
import { logException } from "@/lib/error-logger"
import type { SecretResolver } from "@lucky/shared/contracts/ingestion"
import { decryptGCM, normalizeNamespace } from "./lockbox"
import { fetchSecret, fetchSecrets, touchSecrets } from "./secret-repository"

/**
 * Context-aware secret resolver.
 * - If `principal` is provided, uses context-aware Supabase client:
 *   - api_key → service role (manual owner filter)
 *   - session → RLS client (Clerk JWT)
 * - If `principal` is omitted, falls back to RLS client (legacy callers from UI)
 */
export function createSecretResolver(clerk_id: string, principal?: Principal): SecretResolver {
  return {
    async get(name: string, namespace?: string): Promise<string | undefined> {
      const ns = normalizeNamespace(namespace)
      const { data, error } = await fetchSecret(clerk_id, name, ns, principal)

      if (error || !data) {
        return undefined
      }

      // Update last_used_at
      await touchSecrets(clerk_id, [data.user_secret_id], principal)

      return decryptGCM({
        ciphertext: data.ciphertext as any,
        iv: data.iv as any,
        authTag: data.auth_tag as any,
      })
    },

    async getAll(names: string[], namespace?: string): Promise<Record<string, string>> {
      const ns = normalizeNamespace(namespace)
      console.log(`[secretResolver.getAll] Fetching ${names.length} secret(s):`, {
        clerk_id,
        namespace: ns,
        requested: names,
      })
      const { data, error } = await fetchSecrets(clerk_id, names, ns, principal)

      if (error) {
        console.error("[secretResolver.getAll] Supabase error:", error)
        return {}
      }

      if (!data || data.length === 0) {
        console.warn(`[secretResolver.getAll] ❌ No secrets found! Requested: [${names.join(", ")}]`)
        return {}
      }

      const foundNames = data.map(d => d.name)
      const missingNames = names.filter(n => !foundNames.includes(n))

      console.log(`[secretResolver.getAll] ✓ Found ${data.length}/${names.length} secret(s):`, {
        found: foundNames,
        missing: missingNames.length > 0 ? missingNames : undefined,
      })

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
          logException(e, {
            location: "/lib/lockbox/secretResolver",
          })
          console.error(`Failed to decrypt secret ${row.name}:`, e)
        }
      }

      // Update last_used_at for all fetched secrets
      if (secretIds.length > 0) {
        await touchSecrets(clerk_id, secretIds, principal)
      }

      return secrets
    },
  }
}
