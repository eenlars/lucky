import { envi } from "@core/utils/env.mjs"
import type { Database } from "@core/utils/json"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client with flexible env resolution
// Prefer server-side secrets if available; fall back to NEXT_PUBLIC only when needed
const projectId = envi.SUPABASE_PROJECT_ID ?? envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID

const supabaseUrl = `https://${projectId}.supabase.co`

const supabaseKey = envi.SUPABASE_ANON_KEY ?? envi.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseKey!, {
  auth: {
    persistSession: false,
  },
})
