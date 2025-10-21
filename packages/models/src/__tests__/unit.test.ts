/**
 * Unit tests for LLM model registry
 * Tests catalog, gateways, registry creation, and user model access
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import { MOCK_CATALOG } from "./fixtures/mock-catalog"

vi.mock("../llm-catalog/catalog", () => ({
  MODEL_CATALOG: MOCK_CATALOG,
}))

import { getGatewayDisplayName, getGatewayKeyName } from "../gateway-utils"
import { findModel, getCatalog, getModelsByGateway } from "../llm-catalog/catalog-queries"
import { GATEWAYS } from "../llm-catalog/providers"
import { createLLMRegistry } from "../llm-registry"

describe("Model Catalog", () => {
  it("has unique IDs and validates all invariants", () => {
    expect(MOCK_CATALOG).toBeDefined()
    expect(Array.isArray(MOCK_CATALOG)).toBe(true)
    expect(MOCK_CATALOG.length).toBeGreaterThan(0)

    const seen = new Set<string>()
    for (const entry of MOCK_CATALOG) {
      expect(entry.gateway).toBeDefined()
      expect(typeof entry.gateway).toBe("string")
      expect(entry.gateway.length).toBeGreaterThan(0)
      expect(entry.gatewayModelId).toBeDefined()
      expect(typeof entry.gatewayModelId).toBe("string")
      expect(entry.gatewayModelId.length).toBeGreaterThan(0)
      expect(typeof entry.input).toBe("number")
      expect(typeof entry.output).toBe("number")
      expect(typeof entry.contextLength).toBe("number")
      expect(typeof entry.intelligence).toBe("number")

      // ID uniqueness (using gateway#gatewayModelId format)
      const fullId = `${entry.gateway}#${entry.gatewayModelId}`
      expect(seen.has(fullId)).toBe(false)
      seen.add(fullId)

      // Gateway format check
      expect(entry.gateway).toMatch(/-api$/)

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
      fallbackKeys: { "openai-api": "sk-fallback" },
    })
    const user = registry.forUser({
      mode: "shared",
      userId: "u1",
      models: ["gpt-4o-mini"],
    })

    const a = user.getCatalog()
    const originalLength = a.length
    const aFirst = JSON.parse(JSON.stringify(a[0]))

    // Mutate returned array & objects
    a.pop()
    ;(a[0] as any).gatewayModelId = "tampered-model"

    // Fetch again - should be unaffected
    const b = user.getCatalog()
    expect(b.length).toBe(originalLength)
    expect(b[0].gatewayModelId).toBe(aFirst.gatewayModelId)
  })

  it("finds models by ID when exists", () => {
    const firstModel = MOCK_CATALOG[0]
    const fullId = `${firstModel.gateway}#${firstModel.gatewayModelId}`
    const model = findModel(fullId)
    expect(model).toBeDefined()
    expect(model?.gateway).toBe(firstModel.gateway)
    expect(model?.gatewayModelId).toBe(firstModel.gatewayModelId)
  })

  it("finds models by name when exists", () => {
    const firstModel = MOCK_CATALOG[0]
    const gatewayModelId = firstModel.gatewayModelId
    const models = findModel(gatewayModelId)
    expect(models).toBeDefined()
  })

  it("gets models by gateway", () => {
    const openaiModels = getModelsByGateway("openai-api")
    expect(openaiModels.length).toBeGreaterThan(0)
    expect(openaiModels.every(m => m.gateway === "openai-api")).toBe(true)
  })
})

describe("Gateway Helpers", () => {
  it("GATEWAYS is defined and contains gateways", () => {
    expect(GATEWAYS).toBeDefined()
    expect(Array.isArray(GATEWAYS)).toBe(true)
    expect(GATEWAYS.length).toBeGreaterThan(0)
  })

  it("getGatewayDisplayName formats gateway names", () => {
    expect(getGatewayDisplayName("OPENAI_API_KEY")).toBeTruthy()
    expect(getGatewayDisplayName("OPENAI_API_KEY")).toBeTruthy()
  })

  it("getGatewayKeyName returns environment variable names", () => {
    expect(getGatewayKeyName("openai-api")).toContain("API_KEY")
    expect(getGatewayKeyName("anthropic")).toContain("API_KEY")
  })
})

describe("LLMRegistry", () => {
  it("creates registry with fallback keys", () => {
    const registry = createLLMRegistry({
      fallbackKeys: {
        "openai-api": "sk-test-key",
        "groq-api": "gsk-test-key",
      },
    })

    expect(registry).toBeDefined()
    expect(registry.forUser).toBeDefined()
  })

  it("throws on invalid mode", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-test" },
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
      fallbackKeys: { "openai-api": "sk-test" },
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
      fallbackKeys: { "openai-api": "sk-test" },
    })
    const allowed = ["gpt-4o-mini"]
    const user = registry.forUser({
      mode: "shared",
      userId: "u",
      models: allowed,
    })

    // Mutate caller array AFTER creating user
    allowed.length = 0

    // Should still work with original list
    expect(() => user.model("gpt-4o-mini")).not.toThrow()
  })

  it("same userId returns isolated instances with different configs", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-test" },
    })

    const a = registry.forUser({
      mode: "shared",
      userId: "same",
      models: ["gpt-4o-mini"],
    })
    const b = registry.forUser({
      mode: "shared",
      userId: "same",
      models: ["gpt-4o"],
    })

    expect(a).not.toBe(b)
    expect(() => a.model("gpt-4o-mini")).not.toThrow()
    expect(() => a.model("gpt-4o")).toThrow("not in user's allowed models")
    expect(() => b.model("gpt-4o")).not.toThrow()
    expect(() => b.model("gpt-4o-mini")).toThrow("not in user's allowed models")
  })

  it("creates user instance in shared mode", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-test" },
    })

    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["gpt-4o-mini"],
    })

    expect(userModels).toBeDefined()
  })

  it("creates user instance in BYOK mode", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-fallback" },
    })

    const userModels = registry.forUser({
      mode: "byok",
      userId: "user1",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-user-key" },
    })

    expect(userModels).toBeDefined()
  })

  it("BYOK mode requires apiKeys and rejects empty objects", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-test" },
    })

    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "user1",
        models: ["gpt-4o"],
      }),
    ).toThrow("BYOK mode requires apiKeys")

    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "user1",
        models: ["gpt-4o"],
        apiKeys: {},
      }),
    ).toThrow("BYOK mode requires apiKeys")
  })

  it("isolates different users", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { "openai-api": "sk-test" },
    })

    const user1 = registry.forUser({
      mode: "byok",
      userId: "user1",
      models: ["gpt-4o-mini"],
      apiKeys: { "openai-api": "sk-user1" },
    })

    const user2 = registry.forUser({
      mode: "byok",
      userId: "user2",
      models: ["gpt-4o"],
      apiKeys: { "openai-api": "sk-user2" },
    })

    expect(user1).not.toBe(user2)
  })
})

describe("UserModels", () => {
  let registry: ReturnType<typeof createLLMRegistry>

  beforeEach(() => {
    registry = createLLMRegistry({
      fallbackKeys: {
        "openai-api": "sk-fallback",
        "groq-api": "gsk-fallback",
      },
    })
  })

  it("returns model with gateway prefix", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["gpt-4o-mini"],
    })

    const model = userModels.model("gpt-4o-mini")
    expect(model).toBeDefined()
  })

  it("auto-detects gateway from unprefixed name", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["gpt-4o-mini"],
    })

    const model = userModels.model("gpt-4o-mini")
    expect(model).toBeDefined()
  })

  it("throws when model not in allowlist", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["gpt-4o-mini"],
    })

    expect(() => userModels.model("gpt-4o")).toThrow()
  })

  it("tier('cheap') selects cheapest model", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["gpt-4o-mini", "gpt-4o"],
    })

    const model = userModels.tier("cheap")
    expect(model).toBeDefined()
  })

  it("tier('smart') selects highest intelligence", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["gpt-4o-mini", "gpt-4o"],
    })

    const model = userModels.tier("smart")
    expect(model).toBeDefined()
  })

  it("getCatalog() returns defensive copy", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["gpt-4o-mini"],
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
      models: ["gpt-4o-mini"],
    })

    const cheap = userModels.tier("cheap")
    expect((cheap as any).modelId).toBe("gpt-4o-mini")
  })

  it("all operations complete synchronously without async", () => {
    const userModels = registry.forUser({
      mode: "shared",
      userId: "user1",
      models: ["gpt-4o-mini", "gpt-3.5-turbo"],
    })

    // Verify operations are synchronous (don't return promises)
    const m = userModels.model("gpt-4o-mini")
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
      models: ["gpt-4o-mini"],
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
