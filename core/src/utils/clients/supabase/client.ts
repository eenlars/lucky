import type { Database } from "@core/utils/clients/supabase/types"
import { envi } from "@core/utils/env.mjs"
import { createClient } from "@supabase/supabase-js"

// create Supabase client for client-side usage
const supabaseUrl = `https://${envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID}.supabase.co`
const supabaseKey = envi.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseKey!, {
  auth: {
    persistSession: false,
  },
})
