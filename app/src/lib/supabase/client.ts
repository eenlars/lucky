import { type Database } from "@lucky/shared"
import { createBrowserClient } from "@supabase/ssr"
import { envi } from "@/env.mjs"

export function createClient() {
  // Use standard SUPABASE_URL env var, fallback to constructed URL
  const supabaseUrl = envi.NEXT_PUBLIC_SUPABASE_URL ?? 
    (envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID ? `https://${envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID}.supabase.co` : null)
  
  const supabaseKey = envi.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase configuration. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
