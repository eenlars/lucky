// lazy supabase client - only initialized when persistence is actually used
import { type SupabaseClient, createClient } from "@supabase/supabase-js"

let _supabaseClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient

  const projectId = process.env.SUPABASE_PROJECT_ID
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!projectId || !anonKey) {
    throw new Error("Missing SUPABASE_PROJECT_ID or SUPABASE_ANON_KEY environment variables")
  }

  const supabaseUrl = `https://${projectId}.supabase.co`
  _supabaseClient = createClient(supabaseUrl, anonKey)

  return _supabaseClient
}

export function resetSupabaseClient(): void {
  _supabaseClient = null
}
