// lazy supabase client - only initialized when persistence is actually used
import { getSupabaseCredentials } from "@lucky/shared/supabase-credentials.server"
import { type SupabaseClient, createClient } from "@supabase/supabase-js"

let _supabaseClient: SupabaseClient | null = null

/**
 * Gets or creates a Supabase client for the persistence adapter.
 * Uses service role key to bypass RLS for persistence operations.
 *
 * @returns Supabase client with admin privileges
 * @throws {Error} If SUPABASE_SERVICE_ROLE_KEY is not configured
 */
export function getSupabaseClient(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient

  // Enforce server-only usage for the adapter
  if (typeof window !== "undefined") {
    throw new Error(
      "@together/adapter-supabase is server-only. Use the app's Supabase client for browser code or switch to memory backend.",
    )
  }

  // Get credentials with service role key for admin operations
  // This is necessary for persistence adapter to write workflow results
  const { url, key } = getSupabaseCredentials({ keyType: "service" })

  _supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  return _supabaseClient
}

export function resetSupabaseClient(): void {
  _supabaseClient = null
}
