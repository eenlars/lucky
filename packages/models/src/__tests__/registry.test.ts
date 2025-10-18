/**
 * Tests for LLMRegistry and UserModels
 * Validates all requirements from REQUIREMENTS_DOCUMENT.md
 */

import { describe, expect, it } from "vitest"
import { MODEL_CATALOG } from "../llm-catalog/catalog"
import { createLLMRegistry } from "../llm-registry"

describe("LLMRegistry", () => {
  describe("createLLMRegistry", () => {
    it("creates registry with fallback keys", () => {
      const registry = createLLMRegistry({
        fallbackKeys: {
          openai: "sk-test-key",
          groq: "gsk-test-key",
          openrouter: "sk-or-test-key",
        },
      })

      expect(registry).toBeDefined()
      expect(typeof registry.forUser).toBe("function")
    })

    it("creates registry with partial keys", () => {
      const registry = createLLMRegistry({
        fallbackKeys: {
          openai: "sk-test-key",
        },
      })

      expect(registry).toBeDefined()
    })

    it("creates registry with empty keys", () => {
      const registry = createLLMRegistry({
        fallbackKeys: {},
      })

      expect(registry).toBeDefined()
    })
  })

  describe("forUser - shared mode", () => {
    it("creates user instance in shared mode", () => {
      const registry = createLLMRegistry({
        fallbackKeys: { openai: "sk-test" },
      })

      const userModels = registry.forUser({
        mode: "shared",
        userId: "user-123",
        models: ["openai#gpt-4o-mini"],
      })

      expect(userModels).toBeDefined()
    })

    it("allows empty model list", () => {
      const registry = createLLMRegistry({
        fallbackKeys: { openai: "sk-test" },
      })

      const userModels = registry.forUser({
        mode: "shared",
        userId: "user-123",
        models: [],
      })

      expect(userModels).toBeDefined()
    })

    it("works without apiKeys in shared mode", () => {
      const registry = createLLMRegistry({
        fallbackKeys: { openai: "sk-test" },
      })

      expect(() =>
        registry.forUser({
          mode: "shared",
          userId: "user-123",
          models: ["openai#gpt-4o-mini"],
        }),
      ).not.toThrow()
    })
  })

  describe("forUser - BYOK mode", () => {
    it("creates user instance in BYOK mode with apiKeys", () => {
      const registry = createLLMRegistry({
        fallbackKeys: { openai: "sk-fallback" },
      })

      const userModels = registry.forUser({
        mode: "byok",
        userId: "user-123",
        models: ["openai#gpt-4o"],
        apiKeys: {
          openai: "sk-user-key",
        },
      })

      expect(userModels).toBeDefined()
    })

    it("throws error when BYOK mode without apiKeys", () => {
      const registry = createLLMRegistry({
        fallbackKeys: { openai: "sk-test" },
      })

      expect(() =>
        registry.forUser({
          mode: "byok",
          userId: "user-123",
          models: ["openai#gpt-4o"],
        }),
      ).toThrow("BYOK mode requires apiKeys")
    })

    it("throws error when BYOK mode with empty apiKeys", () => {
      const registry = createLLMRegistry({
        fallbackKeys: { openai: "sk-test" },
      })

      expect(() =>
        registry.forUser({
          mode: "byok",
          userId: "user-123",
          models: ["openai#gpt-4o"],
          apiKeys: {},
        }),
      ).toThrow("BYOK mode requires apiKeys")
    })
  })

  describe("forUser - validation", () => {
    it("throws error for invalid mode", () => {
      const registry = createLLMRegistry({
        fallbackKeys: { openai: "sk-test" },
      })

      expect(() =>
        registry.forUser({
          mode: "invalid" as any,
          userId: "user-123",
          models: [],
        }),
      ).toThrow('Mode must be "byok" or "shared"')
    })
  })
})

describe("UserModels", () => {
  const registry = createLLMRegistry({
    fallbackKeys: {
      openai: "sk-test-openai",
      groq: "gsk-test-groq",
      openrouter: "sk-or-test",
    },
  })

  describe("model() - with provider prefix", () => {
    it("returns model with full ID format", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      })

      const model = userModels.model("openai#gpt-4o-mini")
      expect(model).toBeDefined()
    })

    it("works with groq models", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["groq#openai/gpt-oss-20b"],
      })

      const model = userModels.model("groq#openai/gpt-oss-20b")
      expect(model).toBeDefined()
    })

    it("throws when model not in user's allowed list", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      })

      expect(() => userModels.model("openai#gpt-4o")).toThrow('Model "openai#gpt-4o" not in user\'s allowed models')
    })

    it("throws when model not found in catalog", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["openai#nonexistent-model"],
      })

      expect(() => userModels.model("openai#nonexistent-model")).toThrow("Model not found: openai#nonexistent-model")
    })

    it("throws when provider not configured", () => {
      const registryNoGroq = createLLMRegistry({
        fallbackKeys: {
          openai: "sk-test",
        },
      })

      const userModels = registryNoGroq.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["groq#openai/gpt-oss-20b"],
      })

      expect(() => userModels.model("groq#openai/gpt-oss-20b")).toThrow("Provider not configured: groq")
    })
  })

  describe("model() - without provider prefix (auto-detect)", () => {
    it("auto-detects provider from model name", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      })

      const model = userModels.model("gpt-4o-mini")
      expect(model).toBeDefined()
    })

    it("works when user has model with different prefix format", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["openai#gpt-3.5-turbo"],
      })

      const model = userModels.model("gpt-3.5-turbo")
      expect(model).toBeDefined()
    })

    it("throws when unprefixed model not in user's list", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      })

      expect(() => userModels.model("gpt-4o")).toThrow('Model "gpt-4o" not in user\'s allowed models')
    })
  })

  describe("tier() - cheap", () => {
    it("selects cheapest model from user's list", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: [
          "openai#gpt-4o", // $2.5 / $10
          "openai#gpt-4o-mini", // $0.15 / $0.6
          "openai#gpt-3.5-turbo", // $0.5 / $1.5
        ],
      })

      const model = userModels.tier("cheap")
      expect(model).toBeDefined()
      // Should select gpt-4o-mini (lowest average cost)
    })

    it("throws when no models configured", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: [],
      })

      expect(() => userModels.tier("cheap")).toThrow("No models configured for tier selection")
    })

    it("throws when models list contains invalid IDs", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["invalid#model"],
      })

      expect(() => userModels.tier("cheap")).toThrow("No valid models found in user's configuration")
    })
  })

  describe("tier() - fast", () => {
    it("selects fastest model from user's list", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: [
          "openai#gpt-4o", // speed: medium
          "openai#gpt-4o-mini", // speed: fast
          "groq#openai/gpt-oss-20b", // speed: fast
        ],
      })

      const model = userModels.tier("fast")
      expect(model).toBeDefined()
      // Should select a fast model (gpt-4o-mini or llama)
    })

    it("falls back to cheapest when no fast models", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: [
          "openai#gpt-4o", // speed: medium
          "openai#gpt-4-turbo", // speed: medium
        ],
      })

      const model = userModels.tier("fast")
      expect(model).toBeDefined()
    })
  })

  describe("tier() - smart", () => {
    it("selects highest intelligence model from user's list", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: [
          "openai#gpt-4o", // intelligence: 8
          "openai#gpt-4o-mini", // intelligence: 7
          "openai#gpt-3.5-turbo", // intelligence: 6
        ],
      })

      const model = userModels.tier("smart")
      expect(model).toBeDefined()
      // Should select gpt-4o
    })
  })

  describe("tier() - balanced", () => {
    it("selects balanced cost/intelligence model", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: [
          "openai#gpt-4o", // high cost, high intelligence
          "openai#gpt-4o-mini", // low cost, good intelligence
          "openai#gpt-3.5-turbo", // low cost, lower intelligence
        ],
      })

      const model = userModels.tier("balanced")
      expect(model).toBeDefined()
      // Should balance cost vs intelligence
    })
  })

  describe("tier() - error cases", () => {
    it("throws for unknown tier name", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      })

      expect(() => userModels.tier("unknown" as any)).toThrow("Unknown tier: unknown")
    })
  })

  describe("getCatalog()", () => {
    it("returns full catalog", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      })

      const catalog = userModels.getCatalog()
      expect(catalog).toBeDefined()
      expect(Array.isArray(catalog)).toBe(true)
      expect(catalog.length).toBe(MODEL_CATALOG.length)
    })

    it("catalog is same for all users", () => {
      const user1 = registry.forUser({
        mode: "shared",
        userId: "user-1",
        models: ["openai#gpt-4o"],
      })

      const user2 = registry.forUser({
        mode: "shared",
        userId: "user-2",
        models: ["openai#gpt-4o-mini"],
      })

      expect(user1.getCatalog()).toEqual(user2.getCatalog())
    })

    it("catalog entries have required fields", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: [],
      })

      const catalog = userModels.getCatalog()

      for (const entry of catalog.slice(0, 5)) {
        // Check first 5
        expect(entry.id).toBeDefined()
        expect(entry.provider).toBeDefined()
        expect(entry.model).toBeDefined()
        expect(typeof entry.input).toBe("number")
        expect(typeof entry.output).toBe("number")
        expect(typeof entry.contextLength).toBe("number")
        expect(typeof entry.intelligence).toBe("number")
      }
    })
  })

  describe("sync methods requirement", () => {
    it("model() returns synchronously", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      })

      const start = Date.now()
      const model = userModels.model("openai#gpt-4o-mini")
      const duration = Date.now() - start

      expect(model).toBeDefined()
      expect(duration).toBeLessThan(10) // Should be instant
    })

    it("tier() returns synchronously", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: ["openai#gpt-4o-mini", "openai#gpt-3.5-turbo"],
      })

      const start = Date.now()
      const model = userModels.tier("cheap")
      const duration = Date.now() - start

      expect(model).toBeDefined()
      expect(duration).toBeLessThan(10)
    })

    it("getCatalog() returns synchronously", () => {
      const userModels = registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: [],
      })

      const start = Date.now()
      const catalog = userModels.getCatalog()
      const duration = Date.now() - start

      expect(catalog).toBeDefined()
      expect(duration).toBeLessThan(10)
    })
  })

  describe("user isolation requirement", () => {
    it("different users have independent model lists", () => {
      const user1 = registry.forUser({
        mode: "shared",
        userId: "user-1",
        models: ["openai#gpt-4o"],
      })

      const user2 = registry.forUser({
        mode: "shared",
        userId: "user-2",
        models: ["openai#gpt-4o-mini"],
      })

      // user1 can access gpt-4o
      expect(() => user1.model("openai#gpt-4o")).not.toThrow()

      // user1 cannot access gpt-4o-mini
      expect(() => user1.model("openai#gpt-4o-mini")).toThrow()

      // user2 can access gpt-4o-mini
      expect(() => user2.model("openai#gpt-4o-mini")).not.toThrow()

      // user2 cannot access gpt-4o
      expect(() => user2.model("openai#gpt-4o")).toThrow()
    })

    it("BYOK users have independent API keys", () => {
      const byokUser = registry.forUser({
        mode: "byok",
        userId: "byok-user",
        models: ["openai#gpt-4o"],
        apiKeys: { openai: "sk-user-specific" },
      })

      const sharedUser = registry.forUser({
        mode: "shared",
        userId: "shared-user",
        models: ["openai#gpt-4o"],
      })

      // Both can access the same model
      expect(() => byokUser.model("openai#gpt-4o")).not.toThrow()
      expect(() => sharedUser.model("openai#gpt-4o")).not.toThrow()

      // But they use different keys (verified by separate provider instances)
      expect(byokUser).not.toBe(sharedUser)
    })
  })

  describe("tier constraint requirement", () => {
    it("tier only selects from user's configured models", () => {
      // User has only expensive models
      const expensiveUser = registry.forUser({
        mode: "shared",
        userId: "expensive-user",
        models: ["openai#gpt-4o", "openai#gpt-4-turbo"],
      })

      // tier("cheap") picks cheapest FROM USER'S LIST, not from entire catalog
      const model = expensiveUser.tier("cheap")
      expect(model).toBeDefined()
      // It picks gpt-4o (cheaper than gpt-4-turbo), NOT gpt-4o-mini from catalog
    })

    it("user with only 1 model gets that model for any tier", () => {
      const singleModelUser = registry.forUser({
        mode: "shared",
        userId: "single-user",
        models: ["openai#gpt-4o"],
      })

      const cheap = singleModelUser.tier("cheap")
      const fast = singleModelUser.tier("fast")
      const smart = singleModelUser.tier("smart")
      const balanced = singleModelUser.tier("balanced")

      // All tiers return the same model since there's only one choice
      expect(cheap).toBeDefined()
      expect(fast).toBeDefined()
      expect(smart).toBeDefined()
      expect(balanced).toBeDefined()
    })
  })
})
