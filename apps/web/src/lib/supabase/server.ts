// Runtime guard: Prevent client-side usage
if (typeof window !== "undefined") {
  throw new Error(
    "[SECURITY] @/lib/supabase/server cannot be imported in client-side code. " +
      "This file can create clients with service role keys that bypass RLS. " +
      "Use @/lib/supabase/client for client-side Supabase access.",
  )
}

import type { Database } from "@lucky/shared/client"
import { type GetCredentialsOptions, getSupabaseCredentials } from "@lucky/shared/supabase-credentials.server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Creates a Supabase client for server-side use (Server Components, Route Handlers, Server Actions).
 *
 * By default, uses the anon key with RLS for security.
 * Pass `{ keyType: 'service' }` only for admin operations that need to bypass RLS.
 *
 * @param options - Options for credential selection
 * @returns Supabase server client configured with request cookies
 */
export async function createClient(options?: GetCredentialsOptions) {
  const cookieStore = await cookies()

  // Get credentials from shared resolver (server context)
  const { url, key } = getSupabaseCredentials(options)

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}
