import { envi } from "@/env.mjs"
import { auth } from "@clerk/nextjs/server"
import type { Database } from "@lucky/shared/client"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Creates a user-scoped Supabase client for server-side use with RLS.
 * Uses Clerk's session token instead of the service-role key to ensure
 * Row-Level Security policies are enforced based on the authenticated user.
 *
 * IMPORTANT: Use this client in API routes and server actions that query
 * tables with RLS policies (e.g., WorkflowInvocation, Workflow, etc.)
 *
 * DO NOT use the createClient() from @/lib/supabase/server for RLS-protected
 * queries, as it uses the service-role key which bypasses all RLS policies.
 */
export async function createRLSClient() {
  const supabaseUrl = envi.SUPABASE_URL ?? envi.NEXT_PUBLIC_SUPABASE_URL

  // Always use anon key for RLS (never service-role key)
  const supabaseKey = envi.SUPABASE_ANON_KEY ?? envi.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase configuration. Please set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY",
    )
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    // Get Clerk session token and pass it to Supabase
    // This allows RLS policies to identify the current user via iam.current_user_id()
    async accessToken() {
      const token = await (await auth()).getToken()
      return token
    },
  })
}
