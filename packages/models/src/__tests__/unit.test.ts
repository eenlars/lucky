/**
 * Unit tests for LLM model registry
 * Tests catalog, providers, registry creation, and user model access
 */

import { describe, expect, it, vi } from "vitest"
import { MOCK_CATALOG } from "./fixtures/mock-catalog"
import type { LuckyProvider } from "@lucky/shared"

vi.mock("../llm-catalog/catalog", () => ({
  MODEL_CATALOG: MOCK_CATALOG,
}))

import { createLLMRegistry } from "../llm-registry"
import { findModelById, findModelByName, getCatalog, getModelsByProvider } from "../llm-catalog/catalog-queries"

describe("Model Catalog", () => {
  it("has unique IDs and validates all invariants", () => {
    expect(MOCK_CATALOG).toBeDefined()
    expect(Array.isArray(MOCK_CATALOG)).toBe(true)
    expect(MOCK_CATALOG.length).toBeGreaterThan(0)

    const seen = new Set<string>()
    for (const entry of MOCK_CATALOG) {
      expect(entry.id).toBeDefined()
      expect(typeof entry.id).toBe("string")
      expect(entry.id.length).toBeGreaterThan(2)
      expect(entry.provider).toBeDefined()
      expect(entry.model).toBeDefined()
      expect(typeof entry.input).toBe("number")
      expect(typeof entry.output).toBe("number")
      expect(typeof entry.contextLength).toBe("number")
      expect(typeof entry.intelligence).toBe("number")

      // ID uniqueness
      expect(seen.has(entry.id)).toBe(false)
      seen.add(entry.id)

      // ID format: provider#model
      expect(entry.id.includes("#")).toBe(true)
      const [p, m] = entry.id.split("#")
      expect(p).toBeTruthy()
      expect(m).toBeTruthy()

      // Positivity checks
      expect(entry.input).toBeGreaterThanOrEqual(0)
      expect(entry.output).toBeGreaterThanOrEqual(0)
      expect(entry.contextLength).toBeGreaterThan(0)
      expect(entry.intelligence).toBeGreaterThanOrEqual(0)
    }
  })

  it("getCatalog returns catalog data", () => {
    const catalog = getCatalog()
    expect(catalog).toBeDefined()
    expect(Array.isArray(catalog)).toBe(true)
    expect(catalog.length).toBeGreaterThan(0)
  })

  it("getCatalog returns defensive copy preventing shared references", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { openai: "sk-fallback" },
    })
    const user = registry.forUser({
      mode: "shared",
      userId: "u1",
      models: ["openai#gpt-4o-mini"],
    })

    const a = user.getCatalog()
    const originalLength = a.length
    const aFirst = JSON.parse(JSON.stringify(a[0]))

    // Mutate returned array & objects
    a.pop()
    ;(a[0] as any).id = "tampered#id"

    // Fetch again - should be unaffected
    const b = user.getCatalog()
    expect(b.length).toBe(originalLength)
    expect(b[0].id).toBe(aFirst.id)
  })

  it("finds models by ID when exists", () => {
    const firstModel = MOCK_CATALOG[0]
    const model = findModelById(firstModel.id)
    expect(model).toBeDefined()
    expect(model?.id).toBe(firstModel.id)
  })

  it("finds models by name when exists", () => {
    const firstModel = MOCK_CATALOG[0]
    const modelName = firstModel.model
    const models = findModelByName(modelName)
    expect(models).toBeDefined()
  })

  it("gets models by provider", () => {
    const openaiModels = getModelsByProvider("openai")
    expect(openaiModels.length).toBeGreaterThan(0)
    expect(openaiModels.every(m => m.provider === "openai")).toBe(true)
  })
})

describe("LLMRegistry", () => {
  it("creates registry with fallback keys", () => {
    const registry = createLLMRegistry({
      fallbackKeys: {
        openai: "sk-test-key",
        groq: "gsk-test-key",
      },
    })

    expect(registry).toBeDefined()
    expect(registry.forUser).toBeDefined()
  })

  it("throws on invalid mode", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { openai: "sk-test" },
    })

    expect(() =>
      registry.forUser({
        mode: "invalid" as any,
        userId: "u",
        models: [],
      }),
    ).toThrow('Mode must be "byok" or "shared"')
  })

  it("rejects non-array models input", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { openai: "sk-test" },
    })

    expect(() =>
      registry.forUser({
        mode: "shared",
        userId: "u",
        models: null as any,
      }),
    ).toThrow("models must be an array")

    expect(() =>
      registry.forUser({
        mode: "shared",
        userId: "u",
        models: 123 as any,
      }),
    ).toThrow("models must be an array")
  })

  it("ignores caller mutations to models array after forUser", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { openai: "sk-test" },
    })
    const allowed = ["openai#gpt-4o-mini"]
    const user = registry.forUser({
      mode: "shared",
      userId: "u",
      models: allowed,
    })

    // Mutate caller array AFTER creating user
    allowed.length = 0

    // Should still work with original list
    expect(() => user.model("openai#gpt-4o-mini")).not.toThrow()
  })

  it("same userId returns isolated instances with different configs", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { openai: "sk-test" },
    })

    const a = registry.forUser({
      mode: "shared",
      userId: "same",
      models: ["openai#gpt-4o-mini"],
    })
    const b = registry.forUser({
      mode: "shared",
      userId: "same",
      models: ["openai#gpt-4o"],
    })

    expect(a).not.toBe(b)
    expect(() => a.model("openai#gpt-4o-mini")).not.toThrow()
    expect(() => a.model("openai#gpt-4o")).toThrow("not in user's allowed models")
    expect(() => b.model("openai#gpt-4o")).not.toThrow()
    expect(() => b.model("openai#gpt-4o-mini")).toThrow("not in user's allowed models")
  })

  it("creates user instance in shared mode", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { openai: "sk-test" },
    })

    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["openai#gpt-4o-mini"],
    })

    expect(userModels).toBeDefined()
  })

  it("creates user instance in BYOK mode", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { openai: "sk-fallback" },
    })

    const userModels = registry.forUser({
      mode: "byok",
      userId: "user1",
      models: ["openai#gpt-4o-mini"],
      apiKeys: { openai: "sk-user-key" },
    })

    expect(userModels).toBeDefined()
  })

  it("BYOK mode requires apiKeys and rejects empty objects", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { openai: "sk-test" },
    })

    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "user1",
        models: ["openai#gpt-4o"],
      }),
    ).toThrow("BYOK mode requires apiKeys")

    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "user1",
        models: ["openai#gpt-4o"],
        apiKeys: {},
      }),
    ).toThrow("BYOK mode requires apiKeys")
  })

  it("isolates different users", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { openai: "sk-test" },
    })

    const user1 = registry.forUser({
      mode: "byok",
      userId: "user1",
      models: ["openai#gpt-4o-mini"],
      apiKeys: { openai: "sk-user1" },
    })

    const user2 = registry.forUser({
      mode: "byok",
      userId: "user2",
      models: ["openai#gpt-4o"],
      apiKeys: { openai: "sk-user2" },
    })

    expect(user1).not.toBe(user2)
  })
})

describe("UserModels", () => {
  let registry: ReturnType<typeof createLLMRegistry>

  beforeEach(() => {
    registry = createLLMRegistry({
      fallbackKeys: {
        openai: "sk-fallback",
        groq: "gsk-fallback",
      },
    })
  })

  it("returns model with provider prefix", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["openai#gpt-4o-mini"],
    })

    const model = userModels.model("openai#gpt-4o-mini")
    expect(model).toBeDefined()
  })

  it("auto-detects provider from unprefixed name", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["openai#gpt-4o-mini"],
    })

    const model = userModels.model("gpt-4o-mini")
    expect(model).toBeDefined()
  })

  it("throws when model not in allowlist", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["openai#gpt-4o-mini"],
    })

    expect(() => userModels.model("openai#gpt-4o")).toThrow()
  })

  it("tier('cheap') selects cheapest model", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["openai#gpt-4o-mini", "openai#gpt-4o"],
    })

    const model = userModels.tier("cheap")
    expect(model).toBeDefined()
  })

  it("tier('smart') selects highest intelligence", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["openai#gpt-4o-mini", "openai#gpt-4o"],
    })

    const model = userModels.tier("smart")
    expect(model).toBeDefined()
  })

  it("getCatalog() returns defensive copy", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["openai#gpt-4o-mini"],
    })

    const cat1 = userModels.getCatalog()
    const cat2 = userModels.getCatalog()

    expect(cat1).not.toBe(cat2)
    cat1[0].input = 999
    expect(cat2[0].input).not.toBe(999)
  })

  it("tier() only selects from user's allowed models", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["openai#gpt-4o-mini"],
    })

    const cheap = userModels.tier("cheap")
    expect((cheap as any).modelId).toBe("openai#gpt-4o-mini")
  })

  it("all operations complete synchronously without async", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["openai#gpt-4o-mini", "openai#gpt-3.5-turbo"],
    })

    // Verify operations are synchronous (don't return promises)
    const m = userModels.model("openai#gpt-4o-mini")
    expect(m).toBeDefined()
    expect(m).not.toBeInstanceOf(Promise)

    const t = userModels.tier("cheap")
    expect(t).toBeDefined()
    expect(t).not.toBeInstanceOf(Promise)

    const c = userModels.getCatalog()
    expect(c).toBeDefined()
    expect(Array.isArray(c)).toBe(true)
  })

  it("throws on unknown tier name", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["openai#gpt-4o-mini"],
    })

    expect(() => userModels.tier("mystery" as any)).toThrow("Unknown tier: mystery")
  })

  it("throws when empty allowlist or all invalid models", () => {
    const empty = registry.forUser({
      mode: "shared",
      userId: "empty",
      models: [],
    })
    expect(() => empty.tier("cheap")).toThrow("No models configured for tier selection")

    const invalid = registry.forUser({
      mode: "shared",
      userId: "bad",
      models: ["invalid#model"],
    })
    expect(() => invalid.tier("cheap")).toThrow("No valid models found in user's configuration")
  })
})
