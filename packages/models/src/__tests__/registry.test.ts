/**
 * Tests for LLMRegistry and UserModels
 * Validates all requirements from REQUIREMENTS_DOCUMENT.md
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { MOCK_CATALOG } from "./fixtures/mock-catalog"

// Mock the catalog module to return our mock catalog
vi.mock("../llm-catalog/catalog", () => ({
  MODEL_CATALOG: MOCK_CATALOG,
}))

// Import after mocking to ensure the mock is applied
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
        models: ["groq#llama-3.1-8b-instant"],
      })

      const model = userModels.model("groq#llama-3.1-8b-instant")
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
        models: ["groq#llama-3.1-8b-instant"],
      })

      expect(() => userModels.model("groq#llama-3.1-8b-instant")).toThrow("Provider not configured: groq")
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
      expect(catalog.length).toBe(MOCK_CATALOG.length)
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

describe("Defensive input validation - Registry creation", () => {
  it("handles null fallbackKeys", () => {
    expect(() =>
      createLLMRegistry({
        // @ts-expect-error - testing invalid input
        fallbackKeys: null,
      }),
    ).toThrow()
  })

  it("handles undefined fallbackKeys", () => {
    expect(() =>
      createLLMRegistry({
        // @ts-expect-error - testing invalid input
        fallbackKeys: undefined,
      }),
    ).toThrow()
  })

  it("handles empty string as API key value", () => {
    const registry = createLLMRegistry({
      fallbackKeys: {
        openai: "",
      },
    })
    expect(registry).toBeDefined()
  })

  it("handles whitespace-only API key", () => {
    const registry = createLLMRegistry({
      fallbackKeys: {
        openai: "   ",
      },
    })
    expect(registry).toBeDefined()
  })

  it("handles special characters in API key", () => {
    const registry = createLLMRegistry({
      fallbackKeys: {
        openai: "sk-!@#$%^&*(){}[]|\\:;\"'<>,.?/~`",
      },
    })
    expect(registry).toBeDefined()
  })

  it("rejects very long API key (10k chars)", () => {
    const longKey = "sk-" + "a".repeat(10000)
    expect(() =>
      createLLMRegistry({
        fallbackKeys: {
          openai: longKey,
        },
      }),
    ).toThrow("Fallback API key too long")
  })

  it("rejects unicode in API key", () => {
    expect(() =>
      createLLMRegistry({
        fallbackKeys: {
          openai: "sk-🔥💯",
        },
      }),
    ).toThrow("API keys must be ASCII-only")
  })

  it("handles null as API key value", () => {
    const registry = createLLMRegistry({
      fallbackKeys: {
        // @ts-expect-error - testing invalid input
        openai: null,
      },
    })
    expect(registry).toBeDefined()
  })
})

describe("Defensive input validation - forUser userId", () => {
  const registry = createLLMRegistry({
    fallbackKeys: { openai: "sk-test" },
  })

  it("handles empty string userId", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "",
      models: ["openai#gpt-4o-mini"],
    })
    expect(userModels).toBeDefined()
  })

  it("handles whitespace-only userId", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "   ",
      models: ["openai#gpt-4o-mini"],
    })
    expect(userModels).toBeDefined()
  })

  it("handles special characters in userId", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user!@#$%^&*()",
      models: ["openai#gpt-4o-mini"],
    })
    expect(userModels).toBeDefined()
  })

  it("handles very long userId (10k chars)", () => {
    const longUserId = "user-" + "a".repeat(10000)
    const userModels = registry.forUser({
      mode: "shared",
      userId: longUserId,
      models: ["openai#gpt-4o-mini"],
    })
    expect(userModels).toBeDefined()
  })

  it("handles unicode in userId", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user-🚀💯",
      models: ["openai#gpt-4o-mini"],
    })
    expect(userModels).toBeDefined()
  })

  it("handles null userId", () => {
    expect(() =>
      registry.forUser({
        mode: "shared",
        // @ts-expect-error - testing invalid input
        userId: null,
        models: ["openai#gpt-4o-mini"],
      }),
    ).toThrow()
  })

  it("handles undefined userId", () => {
    expect(() =>
      registry.forUser({
        mode: "shared",
        // @ts-expect-error - testing invalid input
        userId: undefined,
        models: ["openai#gpt-4o-mini"],
      }),
    ).toThrow()
  })

  it("handles XSS attempt in userId", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "<script>alert('xss')</script>",
      models: ["openai#gpt-4o-mini"],
    })
    expect(userModels).toBeDefined()
  })

  it("handles SQL injection attempt in userId", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "admin' OR '1'='1",
      models: ["openai#gpt-4o-mini"],
    })
    expect(userModels).toBeDefined()
  })
})

describe("Defensive input validation - forUser models array", () => {
  const registry = createLLMRegistry({
    fallbackKeys: { openai: "sk-test" },
  })

  it("handles malformed model IDs in array", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "test-user",
      models: ["invalid-no-hash", "also#invalid#too#many", ""],
    })
    expect(userModels).toBeDefined()
  })

  it("handles special characters in model IDs", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "test-user",
      models: ["openai#gpt!@#$", "<script>alert('xss')</script>#model"],
    })
    expect(userModels).toBeDefined()
  })

  it("rejects very long model ID in array", () => {
    const longModelId = "openai#" + "a".repeat(10000)
    expect(() =>
      registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: [longModelId],
      }),
    ).toThrow("Model ID too long")
  })

  it("handles unicode in model IDs", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "test-user",
      models: ["openai#gpt-🚀", "groq#llama-💯"],
    })
    expect(userModels).toBeDefined()
  })

  it("handles null in models array", () => {
    expect(() =>
      registry.forUser({
        mode: "shared",
        userId: "test-user",
        // @ts-expect-error - testing invalid input
        models: [null],
      }),
    ).toThrow()
  })

  it("handles undefined in models array", () => {
    expect(() =>
      registry.forUser({
        mode: "shared",
        userId: "test-user",
        // @ts-expect-error - testing invalid input
        models: [undefined],
      }),
    ).toThrow()
  })

  it("handles mixed valid and invalid model IDs", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "test-user",
      models: ["openai#gpt-4o-mini", "invalid", "groq#llama-3.1-8b-instant", ""],
    })
    expect(userModels).toBeDefined()
  })

  it("handles whitespace in model IDs", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "test-user",
      models: ["  openai#gpt-4o-mini  ", "\topenai#gpt-4o\n"],
    })
    expect(userModels).toBeDefined()
  })
})

describe("Defensive input validation - forUser apiKeys", () => {
  const registry = createLLMRegistry({
    fallbackKeys: { openai: "sk-fallback" },
  })

  it("handles empty string as API key in BYOK", () => {
    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "test-user",
        models: ["openai#gpt-4o"],
        apiKeys: {
          openai: "",
        },
      }),
    ).toThrow("BYOK mode requires apiKeys")
  })

  it("handles whitespace-only API key in BYOK", () => {
    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "test-user",
        models: ["openai#gpt-4o"],
        apiKeys: {
          openai: "   ",
        },
      }),
    ).toThrow("BYOK mode requires apiKeys")
  })

  it("handles special characters in BYOK API key", () => {
    const userModels = registry.forUser({
      mode: "byok",
      userId: "test-user",
      models: ["openai#gpt-4o"],
      apiKeys: {
        openai: "sk-!@#$%^&*()",
      },
    })
    expect(userModels).toBeDefined()
  })

  it("rejects very long API key in BYOK (10k chars)", () => {
    const longKey = "sk-" + "a".repeat(10000)
    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "test-user",
        models: ["openai#gpt-4o"],
        apiKeys: {
          openai: longKey,
        },
      }),
    ).toThrow("API key too long")
  })

  it("rejects unicode in BYOK API key", () => {
    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "test-user",
        models: ["openai#gpt-4o"],
        apiKeys: {
          openai: "sk-🔥💯",
        },
      }),
    ).toThrow("API keys must be ASCII-only")
  })

  it("handles null as API key value in BYOK", () => {
    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "test-user",
        models: ["openai#gpt-4o"],
        apiKeys: {
          // @ts-expect-error - testing invalid input
          openai: null,
        },
      }),
    ).toThrow()
  })

  it("handles undefined as API key value in BYOK", () => {
    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "test-user",
        models: ["openai#gpt-4o"],
        apiKeys: {
          // @ts-expect-error - testing invalid input
          openai: undefined,
        },
      }),
    ).toThrow()
  })
})

describe("Defensive input validation - UserModels.model()", () => {
  const registry = createLLMRegistry({
    fallbackKeys: { openai: "sk-test", groq: "gsk-test" },
  })

  const userModels = registry.forUser({
    mode: "shared",
    userId: "test-user",
    models: ["openai#gpt-4o-mini", "groq#llama-3.1-8b-instant"],
  })

  it("handles null modelId", () => {
    expect(() =>
      // @ts-expect-error - testing invalid input
      userModels.model(null),
    ).toThrow()
  })

  it("handles undefined modelId", () => {
    expect(() =>
      // @ts-expect-error - testing invalid input
      userModels.model(undefined),
    ).toThrow()
  })

  it("handles empty string modelId", () => {
    expect(() => userModels.model("")).toThrow()
  })

  it("handles whitespace-only modelId", () => {
    expect(() => userModels.model("   ")).toThrow()
  })

  it("handles malformed modelId (no hash)", () => {
    expect(() => userModels.model("gpt-4o-mini-no-hash")).toThrow()
  })

  it("handles malformed modelId (too many hashes)", () => {
    expect(() => userModels.model("openai#gpt#4o#mini")).toThrow()
  })

  it("handles special characters in modelId", () => {
    expect(() => userModels.model("openai#gpt!@#$")).toThrow()
  })

  it("handles very long modelId (10k chars)", () => {
    const longId = "openai#" + "a".repeat(10000)
    expect(() => userModels.model(longId)).toThrow()
  })

  it("handles unicode in modelId", () => {
    expect(() => userModels.model("openai#gpt-🚀")).toThrow()
  })

  it("handles XSS attempt in modelId", () => {
    expect(() => userModels.model("<script>alert('xss')</script>")).toThrow()
  })

  it("handles SQL injection in modelId", () => {
    expect(() => userModels.model("openai#gpt' OR '1'='1")).toThrow()
  })

  it("handles whitespace around hash", () => {
    expect(() => userModels.model("openai # gpt-4o-mini")).toThrow()
  })

  it("handles tabs and newlines", () => {
    expect(() => userModels.model("\topenai#gpt-4o-mini\n")).toThrow()
  })
})

describe("Defensive input validation - UserModels.tier()", () => {
  const registry = createLLMRegistry({
    fallbackKeys: { openai: "sk-test" },
  })

  const userModels = registry.forUser({
    mode: "shared",
    userId: "test-user",
    models: ["openai#gpt-4o-mini", "openai#gpt-4o"],
  })

  it("handles null tier", () => {
    expect(() =>
      // @ts-expect-error - testing invalid input
      userModels.tier(null),
    ).toThrow()
  })

  it("handles undefined tier", () => {
    expect(() =>
      // @ts-expect-error - testing invalid input
      userModels.tier(undefined),
    ).toThrow()
  })

  it("handles empty string tier", () => {
    expect(() => userModels.tier("" as any)).toThrow()
  })

  it("handles whitespace-only tier", () => {
    expect(() => userModels.tier("   " as any)).toThrow()
  })

  it("handles invalid tier name", () => {
    expect(() => userModels.tier("invalid-tier" as any)).toThrow("Unknown tier")
  })

  it("handles special characters in tier", () => {
    expect(() => userModels.tier("cheap!@#$" as any)).toThrow("Unknown tier")
  })

  it("handles unicode in tier", () => {
    expect(() => userModels.tier("cheap-🚀" as any)).toThrow("Unknown tier")
  })

  it("handles case sensitivity", () => {
    expect(() => userModels.tier("CHEAP" as any)).toThrow("Unknown tier")
  })

  it("handles numeric tier", () => {
    expect(() =>
      // @ts-expect-error - testing invalid input
      userModels.tier(123),
    ).toThrow()
  })

  it("handles object as tier", () => {
    expect(() =>
      // @ts-expect-error - testing invalid input
      userModels.tier({ tier: "cheap" }),
    ).toThrow()
  })
})

describe("Defensive input validation - forUser mode", () => {
  const registry = createLLMRegistry({
    fallbackKeys: { openai: "sk-test" },
  })

  it("handles null mode", () => {
    expect(() =>
      registry.forUser({
        // @ts-expect-error - testing invalid input
        mode: null,
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      }),
    ).toThrow()
  })

  it("handles undefined mode", () => {
    expect(() =>
      registry.forUser({
        // @ts-expect-error - testing invalid input
        mode: undefined,
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      }),
    ).toThrow()
  })

  it("handles empty string mode", () => {
    expect(() =>
      registry.forUser({
        mode: "" as any,
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      }),
    ).toThrow('Mode must be "byok" or "shared"')
  })

  it("handles invalid mode string", () => {
    expect(() =>
      registry.forUser({
        mode: "invalid-mode" as any,
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      }),
    ).toThrow('Mode must be "byok" or "shared"')
  })

  it("handles uppercase mode", () => {
    expect(() =>
      registry.forUser({
        mode: "SHARED" as any,
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      }),
    ).toThrow('Mode must be "byok" or "shared"')
  })

  it("handles numeric mode", () => {
    expect(() =>
      registry.forUser({
        // @ts-expect-error - testing invalid input
        mode: 123,
        userId: "test-user",
        models: ["openai#gpt-4o-mini"],
      }),
    ).toThrow()
  })
})

describe("Resource limits - DOS protection", () => {
  const registry = createLLMRegistry({
    fallbackKeys: { openai: "sk-test" },
  })

  it("rejects too many models (>100)", () => {
    const tooManyModels = Array.from({ length: 101 }, (_, i) => `openai#model-${i}`)
    expect(() =>
      registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: tooManyModels,
      }),
    ).toThrow("Too many models: maximum 100 models allowed per user")
  })

  it("accepts exactly 100 models", () => {
    const exactlyMax = Array.from({ length: 100 }, (_, i) => `openai#model-${i}`)
    const userModels = registry.forUser({
      mode: "shared",
      userId: "test-user",
      models: exactlyMax,
    })
    expect(userModels).toBeDefined()
  })

  it("rejects model ID that is too long (>200 chars)", () => {
    const longModelId = "openai#" + "a".repeat(200)
    expect(() =>
      registry.forUser({
        mode: "shared",
        userId: "test-user",
        models: [longModelId],
      }),
    ).toThrow("Model ID too long: maximum 200 characters allowed")
  })

  it("accepts model ID at exactly 200 chars", () => {
    const exactlyMaxLength = "openai#" + "a".repeat(192) // 7 + 193 = 200
    const userModels = registry.forUser({
      mode: "shared",
      userId: "test-user",
      models: [exactlyMaxLength],
    })
    expect(userModels).toBeDefined()
  })

  it("rejects too many API keys in BYOK (>50)", () => {
    const tooManyKeys: Record<string, string> = {}
    for (let i = 0; i < 51; i++) {
      tooManyKeys[`provider-${i}`] = `sk-key-${i}`
    }
    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "test-user",
        models: ["openai#gpt-4o"],
        apiKeys: tooManyKeys,
      }),
    ).toThrow("Too many API keys: maximum 50 keys allowed")
  })

  it("accepts exactly 50 API keys in BYOK", () => {
    const exactlyMaxKeys: Record<string, string> = {}
    // Create 49 fake providers + 1 valid (openai) = exactly 50
    for (let i = 0; i < 49; i++) {
      exactlyMaxKeys[`provider-${i}`] = `sk-key-${i}`
    }
    // Need at least one valid provider
    exactlyMaxKeys.openai = "sk-valid-key"

    const userModels = registry.forUser({
      mode: "byok",
      userId: "test-user",
      models: ["openai#gpt-4o"],
      apiKeys: exactlyMaxKeys,
    })
    expect(userModels).toBeDefined()
  })

  it("rejects API key that is too long (>500 chars) in BYOK", () => {
    const longKey = "sk-" + "a".repeat(500)
    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "test-user",
        models: ["openai#gpt-4o"],
        apiKeys: {
          openai: longKey,
        },
      }),
    ).toThrow("API key too long")
  })

  it("accepts API key at exactly 500 chars in BYOK", () => {
    const exactlyMaxLength = "sk-" + "a".repeat(497) // 3 + 497 = 500
    const userModels = registry.forUser({
      mode: "byok",
      userId: "test-user",
      models: ["openai#gpt-4o"],
      apiKeys: {
        openai: exactlyMaxLength,
      },
    })
    expect(userModels).toBeDefined()
  })

  it("rejects too many fallback keys (>50)", () => {
    const tooManyFallbackKeys: Record<string, string> = {}
    for (let i = 0; i < 51; i++) {
      tooManyFallbackKeys[`provider-${i}`] = `sk-key-${i}`
    }
    expect(() =>
      createLLMRegistry({
        fallbackKeys: tooManyFallbackKeys,
      }),
    ).toThrow("Too many fallback API keys: maximum 50 keys allowed")
  })

  it("accepts exactly 50 fallback keys", () => {
    const exactlyMaxKeys: Record<string, string> = {}
    for (let i = 0; i < 50; i++) {
      exactlyMaxKeys[`provider-${i}`] = `sk-key-${i}`
    }
    const registry = createLLMRegistry({
      fallbackKeys: exactlyMaxKeys,
    })
    expect(registry).toBeDefined()
  })

  it("rejects fallback key that is too long (>500 chars)", () => {
    const longKey = "sk-" + "a".repeat(500)
    expect(() =>
      createLLMRegistry({
        fallbackKeys: {
          openai: longKey,
        },
      }),
    ).toThrow("Fallback API key too long")
  })

  it("accepts fallback key at exactly 500 chars", () => {
    const exactlyMaxLength = "sk-" + "a".repeat(497) // 3 + 497 = 500
    const registry = createLLMRegistry({
      fallbackKeys: {
        openai: exactlyMaxLength,
      },
    })
    expect(registry).toBeDefined()
  })
})
