/**
 * CLIENT-ONLY Supabase credential resolver.
 * Safe for browser bundles - only accesses NEXT_PUBLIC_* variables.
 * Use import from '@lucky/shared/supabase-credentials.client'
 */

import { supabaseClient } from "./env-models"

export interface SupabaseCredentials {
  url: string
  key: string
}

/**
 * Client-side Supabase credentials resolver.
 * Only reads NEXT_PUBLIC_* environment variables.
 *
 * Security:
 * - Only accesses public environment variables safe for browser bundles
 * - Only provides anonymous key (never service role)
 * - Validates environment variables using Zod
 * - Fails fast with user-friendly error messages
 *
 * @throws {Error} If required credentials are missing or invalid
 */
export function getSupabaseCredentials(): SupabaseCredentials {
  // Read and validate client environment variables
  const rawEnv = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }

  const parseResult = supabaseClient.safeParse(rawEnv)

  if (!parseResult.success) {
    // User-friendly error message without exposing sensitive details
    throw new Error(
      "Supabase configuration error. Please check your environment variables. " +
        "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set and valid.",
    )
  }

  const env = parseResult.data

  // Additional check: both must be present (not just valid schema)
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase configuration incomplete. Both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
    )
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

/**
 * Checks if Supabase credentials are available in the browser.
 *
 * @returns true if the required credentials are present and valid
 */
export function hasSupabaseCredentials(): boolean {
  try {
    getSupabaseCredentials()
    return true
  } catch {
    return false
  }
}
