// lazy supabase client - only initialized when persistence is actually used
import { type SupabaseClient, createClient } from "@supabase/supabase-js"

let _supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient

  // Enforce server-only usage for the adapter
  if (typeof window !== "undefined") {
    throw new Error(
      "@together/adapter-supabase is server-only. Use the app's Supabase client for browser code or switch to memory backend.",
    )
  }

  const url = process.env.SUPABASE_URL
  const projectId = process.env.SUPABASE_PROJECT_ID
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY

  // Determine URL from explicit URL or project id
  const supabaseUrl = url || (projectId ? `https://${projectId}.supabase.co` : undefined)
  if (!supabaseUrl) {
    throw new Error(
      "Supabase URL not configured.\n\n" +
        "Set SUPABASE_URL=https://<project>.supabase.co or SUPABASE_PROJECT_ID=your_project_id\n\n" +
        "Alternatively, use in-memory persistence: USE_MOCK_PERSISTENCE=true",
    )
  }

  // Prefer service role for server-only workloads; fallback to anon key
  const key = serviceRoleKey || anonKey
  if (!key) {
    throw new Error(
      "Supabase key not configured.\n\n" +
        "Set SUPABASE_SERVICE_ROLE_KEY (server-only) or SUPABASE_ANON_KEY.\n\n" +
        "Get keys from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api\n\n" +
        "Alternatively, use in-memory persistence: USE_MOCK_PERSISTENCE=true",
    )
  }

  // Guard against accidental browser usage with service role
  if (serviceRoleKey && typeof window !== "undefined") {
    throw new Error("Refusing to initialize Supabase with service-role key in a browser context")
  }

  _supabaseClient = createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  return _supabaseClient
}

export function resetSupabaseClient(): void {
  _supabaseClient = null
}
