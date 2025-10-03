import { envi } from "@core/utils/env.mjs"
import type { Database } from "@lucky/shared"
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
    // attempt to initialize client
    const projectId = envi.SUPABASE_PROJECT_ID ?? envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID
    const supabaseKey = envi.SUPABASE_ANON_KEY ?? envi.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // validate credentials
    if (!projectId) {
      throw new Error(
        "supabase project id not found.\n\n" +
          "set one of these environment variables:\n" +
          "  - SUPABASE_PROJECT_ID (recommended)\n" +
          "  - NEXT_PUBLIC_SUPABASE_PROJECT_ID\n\n" +
          "example: SUPABASE_PROJECT_ID=abcdefghijklmnop\n\n" +
          "if running examples without supabase, set:\n" +
          "  USE_MOCK_PERSISTENCE=true",
      )
    }

    if (!supabaseKey) {
      throw new Error(
        "supabase anonymous key not found.\n\n" +
          "set one of these environment variables:\n" +
          "  - SUPABASE_ANON_KEY (recommended)\n" +
          "  - NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n" +
          "find your key at: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api\n\n" +
          "if running examples without supabase, set:\n" +
          "  USE_MOCK_PERSISTENCE=true",
      )
    }

    // validate project id format
    if (projectId.length < 10 || !/^[a-z0-9]+$/.test(projectId)) {
      throw new Error(
        `invalid supabase project id format: "${projectId}"\n\nexpected format: lowercase alphanumeric string (e.g., "abcdefghijklmnop")\ncheck your environment variables.`,
      )
    }

    const supabaseUrl = `https://${projectId}.supabase.co`

    // create client
    _supabaseClient = createClient<Database>(supabaseUrl, supabaseKey, {
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
  try {
    getSupabase()
    return true
  } catch {
    return false
  }
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
