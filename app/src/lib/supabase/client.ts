import { type Database } from "@lucky/shared"
import { createBrowserClient } from "@supabase/ssr"
import { envi } from "@/env.mjs"

export function createClient() {
  return createBrowserClient<Database>(
    `https://${envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID}.supabase.co`,
    envi.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
