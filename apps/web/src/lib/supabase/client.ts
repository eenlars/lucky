import { envi } from "@/env.mjs"
import { createCredentialError } from "@lucky/core/utils/config/credential-errors"
import type { Database } from "@lucky/shared/client"
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
 * Creates a singleton Supabase browser client
 * Uses registered token getter for Clerk authentication
 * No session parameter needed - token is provided via registered getter
 */
export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient

  const supabaseUrl =
    envi.NEXT_PUBLIC_SUPABASE_URL ??
    (envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID ? `https://${envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID}.supabase.co` : null)

  const supabaseKey = envi.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl && !envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID) {
    throw createCredentialError("SUPABASE_PROJECT_ID")
  }

  if (!supabaseKey) {
    throw createCredentialError("SUPABASE_ANON_KEY")
  }

  if (!supabaseUrl) {
    throw createCredentialError("SUPABASE_PROJECT_ID", "INVALID_FORMAT", "Invalid Supabase URL configuration")
  }

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseKey, {
    async accessToken() {
      return getTokenRef ? getTokenRef() : null
    },
  })

  return browserClient
}
