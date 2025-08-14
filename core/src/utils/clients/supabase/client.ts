import type { Database } from "@core/utils/clients/supabase/types"
import { envi } from "@core/utils/env.mjs"
import { createClient } from "@supabase/supabase-js"

// Create Supabase client with flexible env resolution for both client and server
const projectId =
  envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID ?? envi.SUPABASE_PROJECT_ID

const supabaseUrl = `https://${projectId}.supabase.co`

const supabaseKey = envi.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? envi.SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseKey!, {
  auth: {
    persistSession: false,
  },
})
