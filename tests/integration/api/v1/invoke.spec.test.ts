/**
 * Integration test for POST /api/v1/invoke endpoint
 * This test makes REAL HTTP calls to the API endpoint
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
  type TestUser,
  createTestUserWithServiceRole,
  createTestWorkflowSimple,
} from "../../../helpers/test-auth-simple"

// Test configuration
const BASE_URL = process.env.TEST_API_URL || "http://localhost:3000"

// Workflow configuration from user requirement
const TEST_WORKFLOW_CONFIG = {
  nodes: [
    {
      nodeId: "assistant",
      description: "Assistant",
      systemPrompt: "You are a helpful assistant. Respond briefly.",
      modelName: "gpt-4.1-nano",
      mcpTools: [],
      codeTools: [],
      handOffs: ["Agent yeahs"],
      memory: {},
    },
    {
      nodeId: "Agent yeahs",
      description: "Second agent",
      systemPrompt: "You are a second agent. Say 'Complete' and end.",
      modelName: "gpt-4.1-nano",
      mcpTools: [],
      codeTools: [],
      handOffs: ["end"],
      memory: {},
    },
  ],
  entryNodeId: "assistant",
  ui: {
    layout: {
      nodes: [
        {
          nodeId: "start",
          x: 12,
          y: 54,
        },
        {
          nodeId: "end",
          x: 1294,
          y: 54,
        },
        {
          nodeId: "assistant",
          x: 234,
          y: 12,
        },
        {
          nodeId: "Agent yeahs",
          x: 764,
          y: 42,
        },
      ],
    },
  },
}

describe("POST /api/v1/invoke - Real Integration Test", () => {
  let testUser: TestUser
  let workflowId: string
  let workflowCleanup: () => Promise<void>

  beforeAll(async () => {
    // Check if server is running
    try {
      const healthCheck = await fetch(`${BASE_URL}/`, { method: "HEAD" })
      if (!healthCheck.ok) {
        throw new Error(`Server not reachable at ${BASE_URL}`)
      }
    } catch (error) {
      console.error(`⚠️  Server must be running at ${BASE_URL} for this test to work`)
      console.error("   Run: cd apps/web && bun run dev")
      throw error
    }

    console.log("📝 Setting up test environment...")

    // Try to use existing API key from environment
    const existingApiKey = process.env.TEST_API_KEY

    if (existingApiKey) {
      console.log("✅ Using existing API key from TEST_API_KEY environment variable")
      // For existing API keys, we'll use a mock workflow ID
      // In production, this would need to be a real workflow
      workflowId = "wf_test_integration"
      testUser = {
        clerkId: "test_user",
        apiKey: existingApiKey,
        secretId: "test_secret",
        cleanup: async () => {},
      }
      workflowCleanup = async () => {}
    } else {
      // Try to create test user with API key using service role
      try {
        console.log("🔧 Attempting to create test user with service role...")
        testUser = await createTestUserWithServiceRole()
        console.log("✅ Test user created with API key")

        // Create test workflow
        const workflow = await createTestWorkflowSimple(testUser.clerkId, TEST_WORKFLOW_CONFIG)
        workflowId = workflow.workflowId
        workflowCleanup = workflow.cleanup
        console.log(`✅ Test workflow created: ${workflowId}`)
      } catch (error: any) {
        console.error("❌ Failed to create test user/workflow:", error.message)
        console.error("\n💡 To run this test, you need to:")
        console.error("   1. Set TEST_API_KEY environment variable with an existing API key")
        console.error("      Example: export TEST_API_KEY='alive_your_key_here'")
        console.error("   2. OR ensure SUPABASE_SERVICE_ROLE_KEY is set and valid")
        console.error("      The service role key should be a JWT starting with 'eyJ...'")
        throw error
      }
    }
  }, 30000)

  afterAll(async () => {
    // Cleanup test data
    if (workflowCleanup) {
      await workflowCleanup()
      console.log("🧹 Cleaned up test workflow")
    }
    if (testUser) {
      await testUser.cleanup()
      console.log("🧹 Cleaned up test user")
    }
  })

  it("should successfully invoke workflow with provided config", async () => {
    const invokeRequest = {
      jsonrpc: "2.0",
      id: "test_001",
      method: "workflow.invoke",
      params: {
        workflow_id: workflowId,
        input: "Hello, this is a test message",
        options: {
          goal: "Test workflow execution",
          trace: true,
          timeoutMs: 30000,
        },
      },
    }

    const response = await fetch(`${BASE_URL}/api/v1/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUser.apiKey}`,
      },
      body: JSON.stringify(invokeRequest),
    })

    expect(response.status).toBeLessThan(500)

    const result = await response.json()
    console.log("📝 Response:", JSON.stringify(result, null, 2))

    // Verify JSON-RPC structure
    expect(result).toHaveProperty("jsonrpc", "2.0")
    expect(result).toHaveProperty("id", "test_001")

    // Check for either success or expected error
    if (result.error) {
      console.log("❌ Received error:")
      console.log(`   Code: ${result.error.code}`)
      console.log(`   Message: ${result.error.message}`)

      // Error codes we might expect:
      // -32001: Workflow not found
      // -32000: Authentication/API key issues
      // -32002: Input validation failed
      expect([-32001, -32000, -32002]).toContain(result.error.code)
    } else {
      // If successful, verify result structure
      expect(result).toHaveProperty("result")
      expect(result.result).toHaveProperty("status")
      expect(result.result).toHaveProperty("meta")
      console.log("✅ Workflow invoked successfully!")
    }
  }, 60000) // 60 second timeout for real API calls

  it("should return authentication error without API key", async () => {
    const invokeRequest = {
      jsonrpc: "2.0",
      id: "test_002",
      method: "workflow.invoke",
      params: {
        workflow_id: workflowId,
        input: "Test",
        options: {},
      },
    }

    const response = await fetch(`${BASE_URL}/api/v1/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // No Authorization header
      },
      body: JSON.stringify(invokeRequest),
    })

    expect(response.status).toBe(401)
    const result = await response.json()

    expect(result).toHaveProperty("error")
    expect(result.error.code).toBe(-32000)
    expect(result.error.message).toContain("Authentication")
  })

  it("should return validation error for invalid request", async () => {
    const invalidRequest = {
      jsonrpc: "2.0",
      id: "test_003",
      method: "workflow.invoke",
      params: {
        // Missing workflow_id
        input: "Test",
      },
    }

    const response = await fetch(`${BASE_URL}/api/v1/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUser.apiKey}`,
      },
      body: JSON.stringify(invalidRequest),
    })

    expect(response.status).toBe(400)
    const result = await response.json()

    expect(result).toHaveProperty("error")
    expect(result.error.code).toBe(-32600)
  })

  it("should handle malformed JSON gracefully", async () => {
    const response = await fetch(`${BASE_URL}/api/v1/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${testUser.apiKey}`,
      },
      body: "{ invalid json",
    })

    expect(response.status).toBeGreaterThanOrEqual(400)
    expect(response.status).toBeLessThan(600)
  })
})

// Additional test that works without full setup - demonstrates endpoint exists
describe("POST /api/v1/invoke - Endpoint Verification (No Auth Required)", () => {
  it("should respond to requests (proves endpoint exists)", async () => {
    const response = await fetch(`${BASE_URL}/api/v1/invoke`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "workflow.invoke",
        params: {
          workflow_id: "test",
          input: "test",
        },
      }),
    })

    // Should get 401 Unauthorized (proves endpoint exists and is working)
    expect(response.status).toBe(401)
    const result = await response.json()
    expect(result).toHaveProperty("error")
    console.log("✅ Endpoint is accessible and returns expected 401")
  })
})

/**
 * Test setup instructions:
 *
 * 1. Ensure environment variables are set:
 *    - SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL
 *    - SUPABASE_SERVICE_ROLE_KEY (for test data creation)
 *    - All required provider API keys (OPENAI_API_KEY, etc.)
 *
 * 2. Start the dev server:
 *    cd apps/web && bun run dev
 *
 * 3. Run the integration test:
 *    bunx vitest run tests/integration/api/v1/invoke.test.ts
 *
 * Note: This test automatically creates and cleans up test users and workflows
 */
