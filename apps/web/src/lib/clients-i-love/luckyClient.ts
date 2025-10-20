/**
 * Lucky Client - RLS-aware persistence wrapper
 *
 * Wraps @together/adapter-supabase with RLS-enabled Supabase client
 * for use in web API routes and server actions.
 *
 * Usage:
 *   const lucky = await createLuckyClient()
 *   await lucky.ensureWorkflowExists(workflowId, description)
 *   await lucky.createWorkflowVersion({ ... })
 */

import { createClient } from "@/lib/supabase/server"
import type { GetCredentialsOptions } from "@lucky/shared/supabase-credentials.server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { SupabaseWorkflowPersistence } from "@together/adapter-supabase"

/**
 * Create a Lucky client with RLS-aware Supabase connection
 * Returns the SupabaseWorkflowPersistence instance directly for easy access
 */
export async function createLuckyClient(options?: GetCredentialsOptions): Promise<SupabaseWorkflowPersistence> {
  const client: SupabaseClient = await createClient(options)
  return new SupabaseWorkflowPersistence(client)
}

// Re-export types for convenience
export type {
  CleanupStats,
  DatasetRecord,
  WorkflowInvocationData,
  WorkflowInvocationUpdate,
  WorkflowVersionData,
} from "@together/adapter-supabase"
