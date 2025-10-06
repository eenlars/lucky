// lazy supabase client - only initialized when persistence is actually used
import { type SupabaseClient, createClient } from "@supabase/supabase-js"

let _supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient

  const projectId = process.env.SUPABASE_PROJECT_ID
  const anonKey = process.env.SUPABASE_ANON_KEY

  // Validate project ID
  if (!projectId) {
    throw new Error(
      "Supabase project ID not configured.\n\n" +
        "Set environment variable: SUPABASE_PROJECT_ID=your_project_id\n\n" +
        "Get your project ID from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/general\n\n" +
        "Alternatively, use in-memory persistence: USE_MOCK_PERSISTENCE=true",
    )
  }

  // Validate anonymous key
  if (!anonKey) {
    throw new Error(
      "Supabase anonymous key not configured.\n\n" +
        "Set environment variable: SUPABASE_ANON_KEY=your_anon_key\n\n" +
        "Get your key from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api\n\n" +
        "Alternatively, use in-memory persistence: USE_MOCK_PERSISTENCE=true",
    )
  }

  // Validate project ID format
  if (projectId.length < 10 || !/^[a-z0-9]+$/.test(projectId)) {
    throw new Error(
      `Invalid Supabase project ID format: "${projectId}"\n\nExpected format: lowercase alphanumeric string (e.g., 'abcdefghijklmnop')\nCheck your SUPABASE_PROJECT_ID environment variable.`,
    )
  }

  const supabaseUrl = `https://${projectId}.supabase.co`
  _supabaseClient = createClient(supabaseUrl, anonKey)

  return _supabaseClient
}

export function resetSupabaseClient(): void {
  _supabaseClient = null
}
