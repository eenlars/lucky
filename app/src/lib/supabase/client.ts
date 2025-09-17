import { type Database } from "@lucky/shared"
import { createBrowserClient } from "@supabase/ssr"
import { envi } from "@/env.mjs"

export function createClient() {
  const projectId = envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID
  const supabaseUrl = `https://${projectId}.supabase.co`
  const supabaseKey = envi.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
