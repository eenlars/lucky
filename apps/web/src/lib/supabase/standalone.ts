// Runtime guard: Prevent client-side usage
if (typeof window !== "undefined") {
  throw new Error(
    "[SECURITY] @/lib/supabase/standalone cannot be imported in client-side code. " +
      "This file can create clients with service role keys that bypass RLS. " +
      "Use @/lib/supabase/client for client-side Supabase access.",
  )
}

import { envi } from "@/env.mjs"
import type { Database } from "@lucky/shared/client"
import { createClient } from "@supabase/supabase-js"

/**
 * Creates a standalone Supabase client for use in scripts and migrations.
 * This client does NOT use cookies() and works outside of Next.js request context.
 *
 * IMPORTANT: Only use this in standalone scripts, not in API routes or server components.
 * For API routes and server components, use createClient() from @/lib/supabase/server
 * or createRLSClient() from @/lib/supabase/server-rls.
 *
 * @param useServiceRole - If true, uses the service role key (bypasses RLS)
 * @returns Supabase client instance
 */
export function createStandaloneClient(useServiceRole = false) {
  const url = envi.SUPABASE_URL ?? envi.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = envi.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = envi.SUPABASE_ANON_KEY ?? envi.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error("Missing Supabase URL. Please set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable.")
  }

  const key = useServiceRole ? serviceKey : anonKey

  if (!key) {
    const requiredVar = useServiceRole ? "SUPABASE_SERVICE_ROLE_KEY" : "SUPABASE_ANON_KEY"
    throw new Error(`Missing ${requiredVar} environment variable.`)
  }

  return createClient<Database>(url, key)
}
