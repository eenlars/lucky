import type { Database } from "@lucky/shared/client"
import { getSupabaseCredentials, hasSupabaseCredentials } from "@lucky/shared/supabase-credentials.server"
import { createClient } from "@supabase/supabase-js"
import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * singleton supabase client with lazy initialization.
 *
 * benefits:
 * - only instantiates when actually used
 * - clear errors when credentials missing
 * - testable via resetSupabaseClient()
 */

let _supabaseClient: SupabaseClient<Database> | null = null
let _initializationError: Error | null = null

/**
 * get or create supabase client singleton.
 *
 * @returns initialized supabase client
 * @throws {Error} when credentials are missing or invalid
 */
export function getSupabase(): SupabaseClient<Database> {
  // return cached client if available
  if (_supabaseClient) {
    return _supabaseClient
  }

  // throw cached error if initialization previously failed
  if (_initializationError) {
    throw _initializationError
  }

  try {
    // get credentials from shared resolver
    const { url, key } = getSupabaseCredentials()

    // create client
    _supabaseClient = createClient<Database>(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          "x-client-info": "@lucky/core",
        },
      },
    })

    return _supabaseClient
  } catch (error) {
    // cache error to avoid re-validation on every call
    _initializationError = error as Error
    throw _initializationError
  }
}

/**
 * check if supabase client is available (credentials present).
 *
 * useful for conditional logic without triggering errors.
 *
 * @returns true if credentials available, false otherwise
 */
export function hasSupabase(): boolean {
  return hasSupabaseCredentials()
}

/**
 * reset supabase client (for testing only).
 *
 * @internal
 */
export function resetSupabaseClient(): void {
  _supabaseClient = null
  _initializationError = null
}

/**
 * legacy export for backward compatibility.
 *
 * uses proxy to lazily initialize client on property access.
 * this allows existing code using `import { supabase }` to continue working.
 *
 * @deprecated use getSupabase() instead for better error handling
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    // lazily initialize client on first property access
    const client = getSupabase()
    const value = client[prop as keyof SupabaseClient<Database>]

    // bind methods to maintain correct 'this' context
    if (typeof value === "function") {
      return value.bind(client)
    }

    return value
  },
})

/**
 * type exports for consumers
 */
export type { SupabaseClient, Database }
