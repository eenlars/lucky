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
import { PROVIDERS } from "../llm-catalog/providers"
import { getProviderDisplayName, getProviderKeyName } from "../provider-utils"

describe("Model Catalog", () => {
  it("contains models with required fields", () => {
    expect(MOCK_CATALOG).toBeDefined()
    expect(Array.isArray(MOCK_CATALOG)).toBe(true)
    expect(MOCK_CATALOG.length).toBeGreaterThan(0)

    for (const entry of MOCK_CATALOG) {
      expect(entry.id).toBeDefined()
      expect(entry.provider).toBeDefined()
      expect(entry.model).toBeDefined()
      expect(typeof entry.input).toBe("number")
      expect(typeof entry.output).toBe("number")
    }
  })

  it("getCatalog returns catalog data", () => {
    const catalog = getCatalog()
    expect(catalog).toBeDefined()
    expect(Array.isArray(catalog)).toBe(true)
    expect(catalog.length).toBeGreaterThan(0)
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

describe("Provider Helpers", () => {
  it("PROVIDERS is defined and contains providers", () => {
    expect(PROVIDERS).toBeDefined()
    expect(Array.isArray(PROVIDERS)).toBe(true)
    expect(PROVIDERS.length).toBeGreaterThan(0)
  })

  it("getProviderDisplayName formats provider names", () => {
    expect(getProviderDisplayName("openai")).toBeTruthy()
    expect(getProviderDisplayName("anthropic")).toBeTruthy()
  })

  it("getProviderKeyName returns environment variable names", () => {
    expect(getProviderKeyName("openai")).toContain("API_KEY")
    expect(getProviderKeyName("anthropic")).toContain("API_KEY")
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

  it("throws when BYOK mode without apiKeys", () => {
    const registry = createLLMRegistry({
      fallbackKeys: { openai: "sk-test" },
    })

    expect(() =>
      registry.forUser({
        mode: "byok",
        userId: "user1",
        models: ["openai#gpt-4o-mini"],
      }),
    ).toThrow()
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
})
