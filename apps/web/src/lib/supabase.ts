/**
 * Supabase client for the app module.
 *
 * This client is initialized with Next.js environment variables and should be used
 * throughout the app instead of importing from core.
 */
import type { Database } from "@lucky/shared"
import { createClient } from "@supabase/supabase-js"

// Get Supabase configuration from environment
const projectId = process.env.SUPABASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID

if (!projectId) {
  throw new Error("Missing Supabase configuration: SUPABASE_PROJECT_ID or NEXT_PUBLIC_SUPABASE_PROJECT_ID must be set")
}

const supabaseUrl = `https://${projectId}.supabase.co`
const supabaseKey = (process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!

if (!supabaseKey) {
  throw new Error("Missing Supabase configuration: SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be set")
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
})
