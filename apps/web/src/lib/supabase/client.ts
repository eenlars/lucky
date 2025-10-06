import { envi } from "@/env.mjs"
import { createCredentialError } from "@lucky/core/utils/config/credential-errors"
import type { Database } from "@lucky/shared/client"
import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  // Use standard SUPABASE_URL env var, fallback to constructed URL
  const supabaseUrl =
    envi.NEXT_PUBLIC_SUPABASE_URL ??
    (envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID ? `https://${envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID}.supabase.co` : null)

  const supabaseKey = envi.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID) {
    throw createCredentialError("SUPABASE_PROJECT_ID")
  }

  if (!supabaseKey) {
    throw createCredentialError("SUPABASE_ANON_KEY")
  }

  if (!supabaseUrl) {
    throw createCredentialError("SUPABASE_PROJECT_ID", "INVALID_FORMAT", "Invalid Supabase URL configuration")
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
