/**
 * BYOK Key Isolation Security Tests
 *
 * Verifies that:
 * 1. User lockbox keys are used (NOT process.env keys)
 * 2. User A's keys are never accessible to User B
 * 3. Process.env keys are never used in production for authenticated users
 * 4. Execution context properly isolates user keys
 *
 * This is a CRITICAL security test that verifies the core promise of BYOK:
 * "Your keys stay YOUR keys and are never shared"
 */

import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Import mock catalog BEFORE mocking
import { MOCK_CATALOG } from "@lucky/models/__tests__/fixtures/mock-catalog"

// Mock the model catalog to use test fixtures (MUST be before other imports)
vi.mock("@lucky/models/llm-catalog/catalog", () => ({
  MODEL_CATALOG: MOCK_CATALOG,
}))

import { type SecretResolver, withExecutionContext } from "@lucky/core/context/executionContext"
import { getModelsInstance } from "@lucky/core/models/models-instance"
import { createLLMRegistry } from "@lucky/models"
import type { Principal } from "@lucky/shared"

// Mock the AI SDK providers to prevent actual API calls
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn((config: { apiKey: string }) => {
    return vi.fn((gatewayModelId: string) => ({
      __provider: "openai",
      __apiKey: config.apiKey, // Store for verification
      modelId: `${gatewayModelId}`,
      doGenerate: vi.fn(),
    }))
  }),
}))

vi.mock("@ai-sdk/groq", () => ({
  createGroq: vi.fn((config: { apiKey: string }) => {
    return vi.fn((gatewayModelId: string) => ({
      __provider: "groq",
      __apiKey: config.apiKey, // Store for verification
      modelId: `${gatewayModelId}`,
      doGenerate: vi.fn(),
    }))
  }),
}))

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter: vi.fn((config: { apiKey: string }) => {
    return vi.fn((gatewayModelId: string) => ({
      __provider: "openrouter",
      __apiKey: config.apiKey, // Store for verification
      modelId: `${gatewayModelId}`,
      doGenerate: vi.fn(),
    }))
  }),
}))

describe("BYOK Key Isolation - Security Critical", () => {
  // Simulate different users with different API keys
  const userAlice: Principal = {
    clerk_id: "user_alice_123",
    auth_method: "session",
    scopes: ["workflows:read", "workflows:execute"],
  }

  const userBob: Principal = {
    clerk_id: "user_bob_456",
    auth_method: "session",
    scopes: ["workflows:read", "workflows:execute"],
  }

  // Mock secret resolvers for each user (simulates lockbox)
  const createMockSecretResolver = (_userId: string, keys: Record<string, string>): SecretResolver => ({
    get: vi.fn(async (key: string) => keys[key]),
    getAll: vi.fn(async (keyNames: string[]) => {
      const result: Record<string, string> = {}
      for (const keyName of keyNames) {
        if (keys[keyName]) {
          result[keyName] = keys[keyName]
        }
      }
      return result
    }),
  })

  // User lockbox keys (different per user)
  const aliceLockboxKeys = {
    OPENAI_API_KEY: "sk-alice-lockbox-openai-key-xyz",
    GROQ_API_KEY: "gsk-alice-lockbox-groq-key-xyz",
  }

  const bobLockboxKeys = {
    OPENAI_API_KEY: "sk-bob-lockbox-openai-key-abc",
    GROQ_API_KEY: "gsk-bob-lockbox-groq-key-abc",
  }

  // Process.env keys (should NEVER be used for authenticated users)
  const originalEnv = process.env
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      OPENAI_API_KEY: "sk-process-env-SHOULD-NEVER-BE-USED",
      GROQ_API_KEY: "gsk-process-env-SHOULD-NEVER-BE-USED",
      OPENROUTER_API_KEY: "sk-or-process-env-SHOULD-NEVER-BE-USED",
      NODE_ENV: "production", // Force production mode
    }
  })

  afterEach(() => {
    // Restore original process.env to prevent test pollution
    process.env = originalEnv
  })

  afterAll(() => {
    // Additional safeguard: restore original process.env after entire suite
    // Ensures no cross-test contamination even if afterEach fails
    process.env = originalEnv
  })

  describe("User Lockbox Keys Are Used (Not process.env)", () => {
    it("uses Alice's lockbox keys when she invokes a workflow", async () => {
      const secrets = createMockSecretResolver(userAlice.clerk_id, aliceLockboxKeys)

      // Simulate API route: fetch user's keys from lockbox
      const apiKeys = await secrets.getAll(["OPENAI_API_KEY", "GROQ_API_KEY"])

      // Create registry with user's lockbox keys as fallback
      const llmRegistry = createLLMRegistry({
        fallbackKeys: {
          "openai-api": apiKeys.OPENAI_API_KEY,
          "groq-api": apiKeys.GROQ_API_KEY,
        },
      })

      // Get user-specific models (simulates what getModelsInstance() does)
      const userModels = llmRegistry.forUser({
        mode: "shared",
        userId: userAlice.clerk_id,
        models: ["gpt-4o-mini", "llama-3.1-8b-instant"],
      })

      // Execute within execution context (simulates workflow invocation)
      await withExecutionContext({ principal: userAlice, secrets, apiKeys, userModels }, async () => {
        const model = userModels.model("gpt-4o-mini")

        // Verify: model instance uses Alice's lockbox key, NOT process.env
        expect((model as any).__apiKey).toBe("sk-alice-lockbox-openai-key-xyz")
        expect((model as any).__apiKey).not.toBe("sk-process-env-SHOULD-NEVER-BE-USED")
      })
    })

    it("uses Bob's lockbox keys when he invokes a workflow", async () => {
      const secrets = createMockSecretResolver(userBob.clerk_id, bobLockboxKeys)

      const apiKeys = await secrets.getAll(["OPENAI_API_KEY", "GROQ_API_KEY"])

      const llmRegistry = createLLMRegistry({
        fallbackKeys: {
          "openai-api": apiKeys.OPENAI_API_KEY,
          "groq-api": apiKeys.GROQ_API_KEY,
        },
      })

      const userModels = llmRegistry.forUser({
        mode: "shared",
        userId: userBob.clerk_id,
        models: ["gpt-4o-mini", "llama-3.1-8b-instant"],
      })

      await withExecutionContext({ principal: userBob, secrets, apiKeys, userModels }, async () => {
        const model = userModels.model("gpt-4o-mini")

        // Verify: model uses Bob's lockbox key, NOT process.env
        expect((model as any).__apiKey).toBe("sk-bob-lockbox-openai-key-abc")
        expect((model as any).__apiKey).not.toBe("sk-process-env-SHOULD-NEVER-BE-USED")
      })
    })

    it("NEVER uses process.env keys in production for authenticated users", async () => {
      const secrets = createMockSecretResolver(userAlice.clerk_id, aliceLockboxKeys)
      const apiKeys = await secrets.getAll(["OPENAI_API_KEY", "GROQ_API_KEY"])

      const llmRegistry = createLLMRegistry({
        fallbackKeys: {
          "openai-api": apiKeys.OPENAI_API_KEY,
          "groq-api": apiKeys.GROQ_API_KEY,
        },
      })

      const userModels = llmRegistry.forUser({
        mode: "shared",
        userId: userAlice.clerk_id,
        models: ["gpt-4o-mini", "llama-3.1-8b-instant"],
      })

      await withExecutionContext({ principal: userAlice, secrets, apiKeys, userModels }, async () => {
        const openaiModel = userModels.model("gpt-4o-mini")
        const groqModel = userModels.model("llama-3.1-8b-instant")

        // CRITICAL: Verify process.env keys are NEVER used
        expect((openaiModel as any).__apiKey).not.toContain("process-env")
        expect((groqModel as any).__apiKey).not.toContain("process-env")

        // Verify correct user keys are used
        expect((openaiModel as any).__apiKey).toBe("sk-alice-lockbox-openai-key-xyz")
        expect((groqModel as any).__apiKey).toBe("gsk-alice-lockbox-groq-key-xyz")
      })
    })
  })

  describe("User Isolation - Keys Never Cross User Boundaries", () => {
    it("Alice's keys are never accessible to Bob's execution context", async () => {
      const aliceSecrets = createMockSecretResolver(userAlice.clerk_id, aliceLockboxKeys)
      const bobSecrets = createMockSecretResolver(userBob.clerk_id, bobLockboxKeys)

      // Alice invokes workflow
      const aliceApiKeys = await aliceSecrets.getAll(["OPENAI_API_KEY"])
      const aliceRegistry = createLLMRegistry({
        fallbackKeys: { "openai-api": aliceApiKeys.OPENAI_API_KEY },
      })

      const aliceModels = aliceRegistry.forUser({
        mode: "shared",
        userId: userAlice.clerk_id,
        models: ["gpt-4o-mini"],
      })

      let aliceModelKey: string | undefined

      await withExecutionContext(
        { principal: userAlice, secrets: aliceSecrets, apiKeys: aliceApiKeys, userModels: aliceModels },
        async () => {
          const model = aliceModels.model("gpt-4o-mini")
          aliceModelKey = (model as any).__apiKey
        },
      )

      // Bob invokes workflow
      const bobApiKeys = await bobSecrets.getAll(["OPENAI_API_KEY"])
      const bobRegistry = createLLMRegistry({
        fallbackKeys: { "openai-api": bobApiKeys.OPENAI_API_KEY },
      })

      const bobModels = bobRegistry.forUser({
        mode: "shared",
        userId: userBob.clerk_id,
        models: ["gpt-4o-mini"],
      })

      let bobModelKey: string | undefined

      await withExecutionContext(
        { principal: userBob, secrets: bobSecrets, apiKeys: bobApiKeys, userModels: bobModels },
        async () => {
          const model = bobModels.model("gpt-4o-mini")
          bobModelKey = (model as any).__apiKey
        },
      )

      // Verify: Alice and Bob have completely different keys
      expect(aliceModelKey).toBe("sk-alice-lockbox-openai-key-xyz")
      expect(bobModelKey).toBe("sk-bob-lockbox-openai-key-abc")
      expect(aliceModelKey).not.toBe(bobModelKey)

      // Verify: Neither user has access to the other's key
      expect(aliceModelKey).not.toContain("bob")
      expect(bobModelKey).not.toContain("alice")
    })

    it("concurrent user executions maintain key isolation", async () => {
      const aliceSecrets = createMockSecretResolver(userAlice.clerk_id, aliceLockboxKeys)
      const bobSecrets = createMockSecretResolver(userBob.clerk_id, bobLockboxKeys)

      // Simulate concurrent workflow invocations
      const [aliceResult, bobResult] = await Promise.all([
        // Alice's execution
        (async () => {
          const apiKeys = await aliceSecrets.getAll(["OPENAI_API_KEY"])
          const registry = createLLMRegistry({
            fallbackKeys: { "openai-api": apiKeys.OPENAI_API_KEY },
          })

          const userModels = registry.forUser({
            mode: "shared",
            userId: userAlice.clerk_id,
            models: ["gpt-4o-mini"],
          })

          return withExecutionContext(
            { principal: userAlice, secrets: aliceSecrets, apiKeys, userModels },
            async () => {
              const model = userModels.model("gpt-4o-mini")
              return (model as any).__apiKey
            },
          )
        })(),

        // Bob's execution (concurrent)
        (async () => {
          const apiKeys = await bobSecrets.getAll(["OPENAI_API_KEY"])
          const registry = createLLMRegistry({
            fallbackKeys: { "openai-api": apiKeys.OPENAI_API_KEY },
          })

          const userModels = registry.forUser({
            mode: "shared",
            userId: userBob.clerk_id,
            models: ["gpt-4o-mini"],
          })

          return withExecutionContext({ principal: userBob, secrets: bobSecrets, apiKeys, userModels }, async () => {
            const model = userModels.model("gpt-4o-mini")
            return (model as any).__apiKey
          })
        })(),
      ])

      // Verify: Each user got their own key, even with concurrent execution
      expect(aliceResult).toBe("sk-alice-lockbox-openai-key-xyz")
      expect(bobResult).toBe("sk-bob-lockbox-openai-key-abc")
    })
  })

  describe("Registry Mode Isolation - BYOK vs Shared", () => {
    it("BYOK mode uses explicitly provided keys (not fallback keys)", async () => {
      // User has lockbox keys
      const secrets = createMockSecretResolver(userAlice.clerk_id, aliceLockboxKeys)
      const apiKeys = await secrets.getAll(["OPENAI_API_KEY"])

      // Create registry with lockbox keys as fallback
      const llmRegistry = createLLMRegistry({
        fallbackKeys: {
          "openai-api": apiKeys.OPENAI_API_KEY, // Alice's lockbox key
        },
      })

      // User explicitly provides different BYOK keys
      const byokKeys = {
        "openai-api": "sk-alice-explicit-byok-key-different",
      }

      const userModels = llmRegistry.forUser({
        mode: "byok",
        userId: userAlice.clerk_id,
        models: ["gpt-4o-mini"],
        apiKeys: byokKeys,
      })

      await withExecutionContext({ principal: userAlice, secrets, apiKeys, userModels }, async () => {
        const model = userModels.model("gpt-4o-mini")

        // Verify: BYOK mode uses the explicitly provided key, NOT the fallback (lockbox) key
        expect((model as any).__apiKey).toBe("sk-alice-explicit-byok-key-different")
        expect((model as any).__apiKey).not.toBe("sk-alice-lockbox-openai-key-xyz")
      })
    })

    it("shared mode uses fallback keys (which are user's lockbox keys)", async () => {
      const secrets = createMockSecretResolver(userAlice.clerk_id, aliceLockboxKeys)
      const apiKeys = await secrets.getAll(["OPENAI_API_KEY"])

      const llmRegistry = createLLMRegistry({
        fallbackKeys: {
          "openai-api": apiKeys.OPENAI_API_KEY, // Alice's lockbox key
        },
      })

      const userModels = llmRegistry.forUser({
        mode: "shared",
        userId: userAlice.clerk_id,
        models: ["gpt-4o-mini"],
      })

      await withExecutionContext({ principal: userAlice, secrets, apiKeys, userModels }, async () => {
        const model = userModels.model("gpt-4o-mini")

        // Verify: shared mode uses fallback keys (which are the user's lockbox keys)
        expect((model as any).__apiKey).toBe("sk-alice-lockbox-openai-key-xyz")
      })
    })

    it("BYOK mode with empty apiKeys throws error (prevents fallback escalation)", async () => {
      const secrets = createMockSecretResolver(userAlice.clerk_id, aliceLockboxKeys)
      const apiKeys = await secrets.getAll(["OPENAI_API_KEY"])

      const llmRegistry = createLLMRegistry({
        fallbackKeys: {
          "openai-api": "sk-company-fallback-key", // Company key
        },
      })
      const userModels = llmRegistry.forUser({
        mode: "shared",
        userId: userAlice.clerk_id,
        models: ["gpt-4o-mini"],
      })

      await withExecutionContext({ principal: userAlice, secrets, apiKeys, userModels }, async () => {
        // Attacker tries to use BYOK mode without providing keys
        // to escalate to company fallback keys
        expect(() =>
          llmRegistry.forUser({
            mode: "byok",
            userId: "attacker",
            models: ["gpt-4o-mini"],
            apiKeys: {}, // Empty - trying to access fallback
          }),
        ).toThrow("BYOK mode requires apiKeys")
      })
    })
  })

  describe("SecretResolver Integration", () => {
    it("models instance uses keys from secretResolver (lockbox)", async () => {
      const secrets = createMockSecretResolver(userAlice.clerk_id, aliceLockboxKeys)
      const apiKeys = await secrets.getAll(["OPENAI_API_KEY", "GROQ_API_KEY"])

      const llmRegistry = createLLMRegistry({
        fallbackKeys: {
          "openai-api": apiKeys.OPENAI_API_KEY,
          "groq-api": apiKeys.GROQ_API_KEY,
        },
      })

      const userModels = llmRegistry.forUser({
        mode: "shared",
        userId: userAlice.clerk_id,
        models: ["gpt-4o-mini", "llama-3.1-8b-instant"],
      })

      await withExecutionContext({ principal: userAlice, secrets, apiKeys, userModels }, async () => {
        // Verify: secretResolver was called for the user's keys
        expect(secrets.getAll).toHaveBeenCalledWith(["OPENAI_API_KEY", "GROQ_API_KEY"])

        // Verify: models use the resolved keys
        const openaiModel = userModels.model("gpt-4o-mini")
        const groqModel = userModels.model("llama-3.1-8b-instant")

        expect((openaiModel as any).__apiKey).toBe(aliceLockboxKeys.OPENAI_API_KEY)
        expect((groqModel as any).__apiKey).toBe(aliceLockboxKeys.GROQ_API_KEY)
      })
    })

    it("each user's secretResolver returns only their keys", async () => {
      const aliceSecrets = createMockSecretResolver(userAlice.clerk_id, aliceLockboxKeys)
      const bobSecrets = createMockSecretResolver(userBob.clerk_id, bobLockboxKeys)

      // Alice's secret resolver should ONLY return Alice's keys
      const aliceKeys = await aliceSecrets.getAll(["OPENAI_API_KEY"])
      expect(aliceKeys.OPENAI_API_KEY).toBe("sk-alice-lockbox-openai-key-xyz")
      expect(aliceKeys.OPENAI_API_KEY).not.toBe(bobLockboxKeys.OPENAI_API_KEY)

      // Bob's secret resolver should ONLY return Bob's keys
      const bobKeys = await bobSecrets.getAll(["OPENAI_API_KEY"])
      expect(bobKeys.OPENAI_API_KEY).toBe("sk-bob-lockbox-openai-key-abc")
      expect(bobKeys.OPENAI_API_KEY).not.toBe(aliceLockboxKeys.OPENAI_API_KEY)
    })
  })

  describe("Edge Cases and Attack Scenarios", () => {
    it("missing lockbox key does not fall back to process.env in production", async () => {
      // User has no GROQ key in lockbox
      const incompleteKeys = {
        OPENAI_API_KEY: "sk-alice-openai-only",
        // No GROQ key!
      }

      const secrets = createMockSecretResolver(userAlice.clerk_id, incompleteKeys)
      const apiKeys = await secrets.getAll(["OPENAI_API_KEY", "GROQ_API_KEY"])

      // Registry created with incomplete keys (no GROQ)
      const llmRegistry = createLLMRegistry({
        fallbackKeys: {
          "openai-api": apiKeys.OPENAI_API_KEY,
          // groq is undefined!
        },
      })

      const userModels = llmRegistry.forUser({
        mode: "shared",
        userId: userAlice.clerk_id,
        models: ["gpt-4o-mini", "llama-3.1-8b-instant"],
      })

      await withExecutionContext({ principal: userAlice, secrets, apiKeys, userModels }, async () => {
        // OpenAI works (user has key)
        const openaiModel = userModels.model("gpt-4o-mini")
        expect((openaiModel as any).__apiKey).toBe("sk-alice-openai-only")

        // GROQ fails gracefully (no provider configured)
        // It should NOT fall back to process.env
        expect(() => userModels.model("llama-3.1-8b-instant")).toThrow("Gateway not configured: groq-api")
      })
    })

    it("execution context without userModels throws clear error", async () => {
      const secrets = createMockSecretResolver(userAlice.clerk_id, aliceLockboxKeys)
      const apiKeys = await secrets.getAll(["OPENAI_API_KEY"])

      // Execution context WITHOUT userModels (misconfiguration)
      await withExecutionContext({ principal: userAlice, secrets, apiKeys }, async () => {
        await expect(getModelsInstance()).rejects.toThrow("UserModels not configured in execution context")
      })
    })

    it("execution context without principal throws clear error", async () => {
      const secrets = createMockSecretResolver(userAlice.clerk_id, aliceLockboxKeys)
      const apiKeys = await secrets.getAll(["OPENAI_API_KEY"])
      const llmRegistry = createLLMRegistry({
        fallbackKeys: { "openai-api": apiKeys.OPENAI_API_KEY },
      })

      const userModels = llmRegistry.forUser({
        mode: "shared",
        userId: userAlice.clerk_id,
        models: ["gpt-4o-mini"],
      })

      // Execution context WITHOUT principal (unauthenticated)
      // The execution context validation happens before getModelsInstance() is called
      try {
        await withExecutionContext({ secrets, apiKeys, userModels } as any, async () => {
          await getModelsInstance()
        })
        expect.fail("Should have thrown an error")
      } catch (error) {
        expect(String(error)).toContain("Invalid execution context")
        expect(String(error)).toContain("principal")
      }
    })
  })
})
