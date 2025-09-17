import { type Database } from "@lucky/shared"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { envi } from "@/env.mjs"

export async function createClient() {
  const cookieStore = await cookies()
  
  // Use standard SUPABASE_URL env var, fallback to constructed URL
  const supabaseUrl = envi.SUPABASE_URL ?? 
    envi.NEXT_PUBLIC_SUPABASE_URL ??
    (envi.SUPABASE_PROJECT_ID ? `https://${envi.SUPABASE_PROJECT_ID}.supabase.co` : null) ??
    (envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID ? `https://${envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID}.supabase.co` : null)
  
  // Prefer service role key for server-side, fallback to anon key
  const supabaseKey = envi.SUPABASE_SERVICE_ROLE_KEY ?? 
    envi.SUPABASE_ANON_KEY ?? 
    envi.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase configuration. Please set SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY")
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  )
}
