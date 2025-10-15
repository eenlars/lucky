import type { Database, TablesInsert } from "@lucky/shared/client"
import { createClient } from "@supabase/supabase-js"
import { nanoid } from "nanoid"
import { envi } from "../../apps/web/src/env.mjs"
/**
 * Simplified test authentication helper that works with existing database setup
 * Uses the service role key properly to access Supabase
 */
import { generateApiKey, hashSecret } from "../../apps/web/src/lib/api-key-utils"
import { createStandaloneClient } from "../../apps/web/src/lib/supabase/standalone"

export interface TestUser {
  clerkId: string
  apiKey: string
  secretId: string
  cleanup: () => Promise<void>
}

/**
 * Creates a test user with API key using service role access
 * If lockbox schema is restricted, this provides alternative approach
 */
export async function createTestUserWithServiceRole(): Promise<TestUser> {
  const supabase = createStandaloneClient(true)
  const clerkId = `test_user_${nanoid(10)}`

  // Generate API key components
  const { keyId, secret, fullKey } = generateApiKey()
  const secretHash = hashSecret(secret)
  const secretId = `test_secret_${nanoid(10)}`

  try {
    // Try to insert into lockbox.secret_keys with service role
    const { data, error } = await supabase
      .schema("lockbox")
      .from("secret_keys") // Table in lockbox schema
      .insert([
        {
          secret_id: secretId,
          clerk_id: clerkId,
          key_id: keyId,
          secret_hash: secretHash,
          name: "Integration Test API Key",
          environment: "test",
          scopes: { all: true },
          created_by: clerkId,
          updated_by: clerkId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select("secret_id")
      .single()

    if (error) {
      console.error("Insert error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw error
    }

    // Cleanup function
    const cleanup = async () => {
      try {
        const cleanupClient = createStandaloneClient(true)
        await cleanupClient
          .schema("lockbox")
          .from("secret_keys")
          .delete()
          .eq("secret_id", data?.secret_id || secretId)
      } catch (err) {
        console.warn("Cleanup failed:", err)
      }
    }

    return {
      clerkId,
      apiKey: fullKey,
      secretId: data?.secret_id || secretId,
      cleanup,
    }
  } catch (error: any) {
    // If direct insert fails, provide helpful error message
    console.error("\n❌ Failed to create test user with service role")
    console.error("Error:", error.message)
    console.error("\n💡 Troubleshooting:")
    console.error("1. Ensure SUPABASE_SERVICE_ROLE_KEY is set correctly")
    console.error("2. The service role key should start with 'eyJ' and be a valid JWT")
    console.error("3. Check if the lockbox schema allows service role access")
    console.error("4. You may need to use TEST_API_KEY environment variable instead")
    throw new Error(`Service role access failed: ${error.message}`)
  }
}

/**
 * Creates a test workflow using public schema (usually less restricted)
 */
export async function createTestWorkflowSimple(
  clerkId: string,
  config: any,
): Promise<{
  workflowId: string
  versionId: string
  cleanup: () => Promise<void>
}> {
  const url = envi.SUPABASE_URL ?? envi.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = envi.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error("Missing required Supabase credentials")
  }

  // Use service role for public schema tables
  const supabase = createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const workflowId = `wf_test_${nanoid(10)}`
  const versionId = `wf_ver_test_${nanoid(10)}`

  try {
    // Insert workflow in public schema (usually less restricted)
    const { error: workflowError } = await supabase
      .from("Workflow") // Public schema table
      .insert([
        {
          wf_id: workflowId,
          clerk_id: clerkId,
          name: "Integration Test Workflow",
          description: "Test workflow for integration testing",
          created_by: clerkId,
          updated_by: clerkId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select("wf_id")
      .single()

    if (workflowError) {
      throw workflowError
    }

    const dsl: TablesInsert<"WorkflowVersion"> = {
      wf_version_id: versionId,
      workflow_id: workflowId,
      dsl: config,
      commit_message: "Integration Test Workflow",
      operation: "init",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Insert workflow version
    const { error: versionError } = await supabase.from("WorkflowVersion").insert(dsl).select("wf_version_id").single()

    if (versionError) {
      // Cleanup workflow if version fails
      await supabase.from("Workflow").delete().eq("wf_id", workflowId)
      throw versionError
    }

    // Cleanup function
    const cleanup = async () => {
      try {
        const cleanupClient = createClient<Database>(url, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
        // Delete version first (foreign key constraint)
        await cleanupClient.from("WorkflowVersion").delete().eq("wf_version_id", versionId)
        // Then delete workflow
        await cleanupClient.from("Workflow").delete().eq("wf_id", workflowId)
      } catch (err) {
        console.warn("Cleanup failed:", err)
      }
    }

    return {
      workflowId,
      versionId,
      cleanup,
    }
  } catch (error: any) {
    console.error("\n❌ Failed to create test workflow")
    console.error("Error:", error.message)
    throw new Error(`Failed to create test workflow: ${error.message}`)
  }
}
