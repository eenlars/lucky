import type { Database } from "@lucky/shared/client"
import { getSupabaseCredentials } from "@lucky/shared/supabase-credentials.client"
import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

type TokenGetter = () => Promise<string | null>

let getTokenRef: TokenGetter | null = null
let browserClient: SupabaseClient<Database> | null = null

/**
 * Register the token getter function from SupabaseTokenBridge
 * This allows the client to get fresh Clerk tokens without using hooks
 */
export function registerSupabaseTokenGetter(getter: TokenGetter) {
  getTokenRef = getter
}

/**
 * Creates a singleton Supabase browser client for use in Client Components.
 * Uses registered token getter for Clerk authentication.
 * Only uses browser-safe credentials (NEXT_PUBLIC_* variables).
 */
export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient

  // Get credentials from shared resolver (browser context)
  const { url, key } = getSupabaseCredentials()

  function decodeJwtPayload(token: string): any {
    try {
      const part = token.split(".")[1] || ""
      const base64 = part.replace(/-/g, "+").replace(/_/g, "/")
      const pad = base64.length % 4
      const padded = base64 + (pad ? "=".repeat(4 - pad) : "")
      const json = typeof atob !== "undefined" ? atob(padded) : Buffer.from(padded, "base64").toString("utf8")
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  browserClient = createBrowserClient<Database>(url, key, {
    async accessToken() {
      const token = getTokenRef ? await getTokenRef() : null
      const expected = process.env.NEXT_PUBLIC_CLERK_EXPECTED_ISSUER || null
      if (token && expected) {
        const payload = decodeJwtPayload(token)
        const iss = payload?.iss
        if (iss && iss !== expected) {
          const msg = `Clerk token issuer mismatch: expected ${expected}, got ${iss}. Ensure you're using production Clerk keys locally.`
          // Throwing here prevents silent anon queries under RLS
          throw new Error(msg)
        }
      }
      return token
    },
  })

  return browserClient
}
