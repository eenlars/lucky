/**
 * SERVER-ONLY Supabase credential resolver.
 * DO NOT import this in client-side code.
 * Use import from '@lucky/shared/supabase-credentials.server'
 */

import { supabaseServer } from "./env-models"

export type SupabaseKeyType = "anon" | "service"

export interface SupabaseCredentials {
  url: string
  key: string
}

export interface GetCredentialsOptions {
  /**
   * Type of key to use. Defaults to 'anon' for safety.
   * Use 'service' only for admin operations, migrations, or when you explicitly need to bypass RLS.
   * @default 'anon'
   */
  keyType?: SupabaseKeyType
}

/**
 * Server-side Supabase credentials resolver.
 * Only reads SUPABASE_* environment variables (never NEXT_PUBLIC_*).
 *
 * Best practices:
 * - Defaults to anon key for RLS safety
 * - Requires explicit opt-in for service role key
 * - Validates environment variables using Zod
 * - Fails fast with clear error messages
 *
 * @throws {Error} If required credentials are missing or invalid
 * @throws {Error} If service role key is requested but not available
 */
export function getSupabaseCredentials(options: GetCredentialsOptions = {}): SupabaseCredentials {
  const { keyType = "anon" } = options

  // Read and validate server environment variables
  const rawEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }

  const parseResult = supabaseServer.safeParse(rawEnv)

  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join(", ")
    throw new Error(
      `[Supabase Server] Invalid environment variables: ${errors}. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set and valid. Set SUPABASE_SERVICE_ROLE_KEY if you need admin access.`,
    )
  }

  const env = parseResult.data

  // Additional check: URL and anon key must be present
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("[Supabase Server] Configuration incomplete. Both SUPABASE_URL and SUPABASE_ANON_KEY are required.")
  }

  // Determine key based on keyType
  let key: string
  if (keyType === "service") {
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        "[Supabase Server] SERVICE_ROLE_KEY requested but SUPABASE_SERVICE_ROLE_KEY is not set. " +
          "This key is required for admin operations and bypasses RLS. " +
          "Do not use in regular API routes unless absolutely necessary.",
      )
    }
    key = env.SUPABASE_SERVICE_ROLE_KEY
  } else {
    key = env.SUPABASE_ANON_KEY
  }

  return {
    url: env.SUPABASE_URL,
    key,
  }
}

/**
 * Checks if Supabase credentials are available on the server.
 *
 * @param options - Options including keyType to check for
 * @returns true if the required credentials are present and valid
 */
export function hasSupabaseCredentials(options: GetCredentialsOptions = {}): boolean {
  try {
    getSupabaseCredentials(options)
    return true
  } catch {
    return false
  }
}
