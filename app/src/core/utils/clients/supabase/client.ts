import type { Database } from "@/core/utils/clients/supabase/types"
import { envi } from "@/env.mjs"
import { createClient } from "@supabase/supabase-js"

// create Supabase client for server-side usage
const supabaseUrl = `https://${envi.SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID}.supabase.co`
const supabaseKey = envi.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseKey!, {
  auth: {
    persistSession: false,
  },
})
