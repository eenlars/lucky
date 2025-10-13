import { nanoid } from "nanoid"
/**
 * Test authentication helpers for integration tests
 * Creates test users and API keys for testing
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
 * Creates a test user with an API key for integration testing
 * This uses the service role to bypass RLS and directly insert test data
 *
 * @returns TestUser object with API key and cleanup function
 */
export async function createTestUser(): Promise<TestUser> {
  const supabase = createStandaloneClient(true) // Use service role
  const clerkId = `test_${nanoid()}`

  // Generate API key
  const { keyId, secret, fullKey } = generateApiKey()
  const secretHash = hashSecret(secret)

  // Insert API key into database
  const { data, error } = await supabase
    .schema("lockbox")
    .from("secret_keys")
    .insert([
      {
        clerk_id: clerkId,
        key_id: keyId,
        secret_hash: secretHash,
        name: "Test API Key",
        environment: "test",
        scopes: { all: true },
        created_by: clerkId,
        updated_by: clerkId,
      } as any,
    ])
    .select("secret_id")
    .single()

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`)
  }

  // Cleanup function to remove test data
  const cleanup = async () => {
    await supabase.schema("lockbox").from("secret_keys").delete().eq("secret_id", data.secret_id)
  }

  return {
    clerkId,
    apiKey: fullKey,
    secretId: data.secret_id,
    cleanup,
  }
}

/**
 * Creates a test workflow for integration testing
 * This uses the service role to bypass RLS
 *
 * @param clerkId - The clerk ID of the user who owns this workflow
 * @param config - The workflow configuration
 * @returns workflow ID and cleanup function
 */
export async function createTestWorkflow(
  clerkId: string,
  config: any,
): Promise<{
  workflowId: string
  versionId: string
  cleanup: () => Promise<void>
}> {
  const supabase = createStandaloneClient(true) // Use service role
  const workflowId = `wf_test_${nanoid()}`

  // Insert workflow
  const { data: workflowData, error: workflowError } = await supabase
    .from("Workflow")
    .insert([
      {
        wf_id: workflowId,
        clerk_id: clerkId,
        name: "Test Workflow",
        description: "Integration test workflow",
        created_by: clerkId,
        updated_by: clerkId,
      } as any,
    ])
    .select("wf_id")
    .single()

  if (workflowError) {
    throw new Error(`Failed to create test workflow: ${workflowError.message}`)
  }

  // Insert workflow version
  const versionId = `wf_ver_test_${nanoid()}`
  const { data: versionData, error: versionError } = await supabase
    .from("WorkflowVersion")
    .insert([
      {
        wf_version_id: versionId,
        wf_id: workflowId,
        config,
        version: 1,
        created_by: clerkId,
        updated_by: clerkId,
      } as any,
    ])
    .select("wf_version_id")
    .single()

  if (versionError) {
    throw new Error(`Failed to create test workflow version: ${versionError.message}`)
  }

  // Cleanup function
  const cleanup = async () => {
    await supabase.from("WorkflowVersion").delete().eq("wf_version_id", versionData.wf_version_id)
    await supabase.from("Workflow").delete().eq("wf_id", workflowData.wf_id)
  }

  return {
    workflowId: workflowData.wf_id,
    versionId: versionData.wf_version_id,
    cleanup,
  }
}
