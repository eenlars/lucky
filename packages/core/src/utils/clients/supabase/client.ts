import { envi } from "@env"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@utils/clients/supabase/types"

// create Supabase client for server-side usage
const supabaseUrl = `https://${envi.SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID}.supabase.co`
const supabaseKey = envi.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseKey!, {
  auth: {
    persistSession: false,
  },
})
