import { type Database } from "@lucky/shared"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { envi } from "@/env.mjs"

export async function createClient() {
  const cookieStore = await cookies()
  
  // Use T3 OSS env with fallback pattern like core
  const projectId = envi.SUPABASE_PROJECT_ID ?? envi.NEXT_PUBLIC_SUPABASE_PROJECT_ID
  const supabaseKey = envi.SUPABASE_ANON_KEY ?? envi.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createServerClient<Database>(
    `https://${projectId}.supabase.co`,
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
