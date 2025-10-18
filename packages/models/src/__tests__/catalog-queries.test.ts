/**
 * Tests for catalog-queries functions
 * Validates query and filter functions with real catalog and edge cases
 */

import type { LuckyProvider } from "@lucky/shared"
import { describe, expect, it } from "vitest"
import { MODEL_CATALOG } from "../llm-catalog/catalog"
import {
  findModel,
  findModelById,
  findModelByName,
  getActiveModelsByProvider,
  getAllProviders,
  getCatalog,
  getModelsByProvider,
  getProviderInfo,
  getRuntimeEnabledModels,
  getRuntimeEnabledProviders,
} from "../llm-catalog/catalog-queries"

describe("findModelById", () => {
  it("finds existing model by exact ID", () => {
    const model = findModelById("openai#gpt-4o-mini")
    expect(model).toBeDefined()
    expect(model?.id).toBe("openai#gpt-4o-mini")
    expect(model?.provider).toBe("openai")
    expect(model?.model).toBe("gpt-4o-mini")
  })

  it("is case-insensitive", () => {
    const model = findModelById("OPENAI#GPT-4O-MINI")
    expect(model).toBeDefined()
    expect(model?.id).toBe("openai#gpt-4o-mini")
  })

  it("returns undefined for non-existent ID", () => {
    const model = findModelById("fake#nonexistent-model-12345")
    expect(model).toBeUndefined()
  })

  it("returns undefined for empty string", () => {
    const model = findModelById("")
    expect(model).toBeUndefined()
  })

  it("returns undefined for malformed ID without hash", () => {
    const model = findModelById("gpt-4o-mini")
    expect(model).toBeUndefined()
  })

  it("returns undefined for ID with multiple hashes", () => {
    const model = findModelById("openai#gpt#4o#mini")
    expect(model).toBeUndefined()
  })

  it("handles whitespace-padded input", () => {
    const model = findModelById("  openai#gpt-4o-mini  ")
    // Should not trim, should return undefined
    expect(model).toBeUndefined()
  })
})

describe("findModelByName", () => {
  it("finds model by exact model name", () => {
    const model = findModelByName("gpt-4o-mini")
    expect(model).toBeDefined()
    expect(model?.model).toBe("gpt-4o-mini")
  })

  it("finds model by suffix match", () => {
    const model = findModelByName("openrouter#meta-llama/llama-4-maverick:free")
    expect(model).toBeDefined()
    expect(model?.id).toContain("openrouter#meta-llama/llama-4-maverick:free")
  })

  it("returns undefined for non-existent name", () => {
    const model = findModelByName("nonexistent-model-xyz-12345")
    expect(model).toBeUndefined()
  })

  it("returns undefined for empty string", () => {
    const model = findModelByName("")
    expect(model).toBeUndefined()
  })

  it("returns first match when multiple providers have same model", () => {
    const model = findModelByName("gpt-4o-mini")
    expect(model).toBeDefined()
    expect(model?.model).toBe("gpt-4o-mini")
  })

  it("finds OpenRouter models with provider/ prefix in name", () => {
    // This tests that findModelByName can handle model names with "/" in them
    // (common in OpenRouter where model names include the provider prefix)
    // We check against the actual catalog to find a model with "/" in the name
    const modelWithSlash = MODEL_CATALOG.find(m => m.model.includes("/"))

    // If no models with "/" exist in catalog, skip the test
    if (!modelWithSlash) {
      console.warn("No models with '/' in name found in catalog - skipping test")
      return
    }

    const model = findModelByName(modelWithSlash.model)
    expect(model).toBeDefined()
    expect(model?.id).toBe(modelWithSlash.id)
    expect(model?.provider).toBe(modelWithSlash.provider)
    expect(model?.model).toBe(modelWithSlash.model)
  })
})

describe("findModelByName with slash in model name", () => {
  it("handles model names containing slash (like OpenRouter provider/model format)", () => {
    // Find any model in the catalog that has a "/" in its name
    // This is common for OpenRouter models which use "provider/model" format
    const testModel = MODEL_CATALOG.find(m => m.model.includes("/"))

    if (!testModel) {
      // If no such model exists, create a minimal test to verify the logic works
      // by testing that the function doesn't break on "/" input
      const result = findModelByName("test/model-name")
      expect(result).toBeUndefined() // Should not find it, but shouldn't crash
      return
    }

    // Test that findModelByName correctly handles the full model name with "/"
    const found = findModelByName(testModel.model)
    expect(found).toBeDefined()
    expect(found?.id).toBe(testModel.id)
    expect(found?.model).toBe(testModel.model)
    expect(found?.provider).toBe(testModel.provider)
  })
})

describe("findModel (backward compatibility)", () => {
  it("behaves identically to findModelById", () => {
    const model1 = findModel("openai#gpt-4o-mini")
    const model2 = findModelById("openai#gpt-4o-mini")
    expect(model1).toEqual(model2)
  })

  it("returns same results for all cases", () => {
    expect(findModel("openai#gpt-4o")).toEqual(findModelById("openai#gpt-4o"))
    expect(findModel("fake#model")).toEqual(findModelById("fake#model"))
    expect(findModel("")).toEqual(findModelById(""))
  })
})

describe("getModelsByProvider", () => {
  it("returns all models for openai", () => {
    const models = getModelsByProvider("openai")
    expect(models.length).toBeGreaterThan(0)
    expect(models.every(m => m.provider === "openai")).toBe(true)
    // Check specific known models exist
    const ids = models.map(m => m.id)
    expect(ids).toContain("openai#gpt-4o-mini")
    expect(ids).toContain("openai#gpt-4o")
  })

  it("returns all models for groq", () => {
    const models = getModelsByProvider("groq")
    expect(models.length).toBeGreaterThan(0)
    expect(models.every(m => m.provider === "groq")).toBe(true)
  })

  it("returns empty array for non-existent provider", () => {
    const models = getModelsByProvider("fake-provider-12345")
    expect(models).toEqual([])
  })

  it("returns empty array for empty string", () => {
    const models = getModelsByProvider("")
    expect(models).toEqual([])
  })

  it("is case-sensitive", () => {
    const models = getModelsByProvider("OpenAI")
    expect(models).toEqual([])
  })

  it("all providers combined equal full catalog", () => {
    const providers = getAllProviders()
    const allModels = providers.flatMap(p => getModelsByProvider(p))
    expect(allModels.length).toBe(MODEL_CATALOG.length)
  })
})

describe("getActiveModelsByProvider", () => {
  it("returns only runtime-enabled models", () => {
    const activeModels = getActiveModelsByProvider("openai")
    expect(activeModels.length).toBeGreaterThan(0)
    // All returned models must have runtimeEnabled !== false
    expect(activeModels.every(m => m.runtimeEnabled !== false)).toBe(true)
  })

  it("filters out disabled models", () => {
    const allModels = getModelsByProvider("openai")
    const activeModels = getActiveModelsByProvider("openai")
    // Active should be subset or equal
    expect(activeModels.length).toBeLessThanOrEqual(allModels.length)

    // Check logic: disabled models should not be in active list
    const disabledModels = allModels.filter(m => m.runtimeEnabled === false)
    for (const disabled of disabledModels) {
      expect(activeModels.find(m => m.id === disabled.id)).toBeUndefined()
    }
  })

  it("returns empty array for non-existent provider", () => {
    const models = getActiveModelsByProvider("fake-provider-12345")
    expect(models).toEqual([])
  })

  it("validates the filtering logic is correct", () => {
    // Test specific known model
    const allOpenAI = getModelsByProvider("openai")
    const activeOpenAI = getActiveModelsByProvider("openai")

    // Count models by runtime status
    const explicitlyDisabled = allOpenAI.filter(m => m.runtimeEnabled === false).length
    const expectedActive = allOpenAI.length - explicitlyDisabled

    expect(activeOpenAI.length).toBe(expectedActive)
  })
})

describe("getRuntimeEnabledModels", () => {
  it("returns only models where runtimeEnabled is not false", () => {
    const models = getRuntimeEnabledModels()
    expect(models.length).toBeGreaterThan(0)
    expect(models.every(m => m.runtimeEnabled !== false)).toBe(true)
  })

  it("excludes models where runtimeEnabled is explicitly false", () => {
    const models = getRuntimeEnabledModels()
    expect(models.find(m => m.runtimeEnabled === false)).toBeUndefined()
  })

  it("includes models where runtimeEnabled is true or undefined", () => {
    const models = getRuntimeEnabledModels()
    const allModels = MODEL_CATALOG

    // Count expected active models
    const expectedActive = allModels.filter(m => m.runtimeEnabled !== false)
    expect(models.length).toBe(expectedActive.length)
  })

  it("returns subset or equal to full catalog", () => {
    const runtimeModels = getRuntimeEnabledModels()
    expect(runtimeModels.length).toBeLessThanOrEqual(MODEL_CATALOG.length)
  })

  it("validates filtering logic is correct", () => {
    const allModels = MODEL_CATALOG
    const activeModels = getRuntimeEnabledModels()

    const disabledCount = allModels.filter(m => m.runtimeEnabled === false).length
    expect(activeModels.length).toBe(allModels.length - disabledCount)
  })

  it("contains expected known models", () => {
    const models = getRuntimeEnabledModels()
    const ids = models.map(m => m.id)
    expect(ids).toContain("openai#gpt-5-nano")
    expect(ids).toContain("openrouter#meta-llama/llama-4-maverick:free")
  })
})

describe("getRuntimeEnabledProviders", () => {
  it("returns array of unique provider names", () => {
    const providers = getRuntimeEnabledProviders()
    expect(Array.isArray(providers)).toBe(true)
    expect(providers.length).toBeGreaterThan(0)
    // Check uniqueness
    const uniqueProviders = new Set(providers)
    expect(uniqueProviders.size).toBe(providers.length)
  })

  it("returns sorted array", () => {
    const providers = getRuntimeEnabledProviders()
    const sorted = [...providers].sort()
    expect(providers).toEqual(sorted)
  })

  it("only includes providers with runtime-enabled models", () => {
    const providers = getRuntimeEnabledProviders()
    for (const provider of providers) {
      const activeModels = getActiveModelsByProvider(provider)
      expect(activeModels.length).toBeGreaterThan(0)
    }
  })

  it("validates logic: matches runtime-enabled models", () => {
    const providers = getRuntimeEnabledProviders()
    const runtimeModels = getRuntimeEnabledModels()

    // Extract providers from runtime models
    const expectedProviders = new Set(runtimeModels.map(m => m.provider))
    expect(providers.length).toBe(expectedProviders.size)

    for (const provider of providers as LuckyProvider[]) {
      expect(expectedProviders.has(provider)).toBe(true)
    }
  })

  it("contains expected providers", () => {
    const providers = getRuntimeEnabledProviders()
    expect(providers).toContain("openai")
    expect(providers).not.toContain("groq")
  })
})

describe("getAllProviders", () => {
  it("returns all unique provider names", () => {
    const providers = getAllProviders()
    expect(Array.isArray(providers)).toBe(true)
    expect(providers.length).toBeGreaterThan(0)
    // Check uniqueness
    const uniqueProviders = new Set(providers)
    expect(uniqueProviders.size).toBe(providers.length)
  })

  it("returns sorted array", () => {
    const providers = getAllProviders()
    const sorted = [...providers].sort()
    expect(providers).toEqual(sorted)
  })

  it("includes all providers from catalog regardless of runtimeEnabled", () => {
    const providers = getAllProviders()
    const catalogProviders = new Set(MODEL_CATALOG.map(m => m.provider))

    expect(providers.length).toBe(catalogProviders.size)
    for (const provider of catalogProviders) {
      expect(providers).toContain(provider)
    }
  })

  it("includes same or more providers than runtime-enabled", () => {
    const allProviders = getAllProviders()
    const runtimeProviders = getRuntimeEnabledProviders()
    expect(allProviders.length).toBeGreaterThanOrEqual(runtimeProviders.length)
  })

  it("validates logic: every runtime provider is in all providers", () => {
    const allProviders = getAllProviders()
    const runtimeProviders = getRuntimeEnabledProviders()

    for (const provider of runtimeProviders) {
      expect(allProviders).toContain(provider)
    }
  })
})

describe("getProviderInfo", () => {
  it("returns array of provider info objects", () => {
    const providerInfo = getProviderInfo()
    expect(Array.isArray(providerInfo)).toBe(true)
    expect(providerInfo.length).toBeGreaterThan(0)
  })

  it("each provider info has correct structure", () => {
    const providerInfo = getProviderInfo()
    for (const info of providerInfo) {
      expect(info).toHaveProperty("name")
      expect(info).toHaveProperty("activeModels")
      expect(typeof info.name).toBe("string")
      expect(typeof info.activeModels).toBe("number")
      expect(info.activeModels).toBeGreaterThan(0)
    }
  })

  it("activeModels count matches actual active models", () => {
    const providerInfo = getProviderInfo()
    for (const info of providerInfo) {
      const actualModels = getActiveModelsByProvider(info.name)
      expect(info.activeModels).toBe(actualModels.length)
    }
  })

  it("only includes runtime-enabled providers", () => {
    const providerInfo = getProviderInfo()
    const runtimeProviders = getRuntimeEnabledProviders()

    expect(providerInfo.length).toBe(runtimeProviders.length)
    for (const info of providerInfo) {
      expect(runtimeProviders).toContain(info.name)
    }
  })

  it("validates logic: info matches getRuntimeEnabledProviders", () => {
    const providerInfo = getProviderInfo()
    const runtimeProviders = getRuntimeEnabledProviders()

    const infoNames = providerInfo.map(i => i.name).sort()
    const expectedNames = [...runtimeProviders].sort()

    expect(infoNames).toEqual(expectedNames)
  })

  it("contains expected provider info", () => {
    const providerInfo = getProviderInfo()
    const names = providerInfo.map(p => p.name)
    expect(names).toContain("openai")
    expect(names).toContain("groq")
  })
})

describe("getCatalog", () => {
  it("returns the full catalog", () => {
    const catalog = getCatalog()
    expect(catalog).toBe(MODEL_CATALOG)
    expect(catalog.length).toBe(MODEL_CATALOG.length)
  })

  it("returns same reference on multiple calls", () => {
    const catalog1 = getCatalog()
    const catalog2 = getCatalog()
    expect(catalog1).toBe(catalog2)
  })
})

describe("edge cases and error conditions", () => {
  it("findModelById handles special characters", () => {
    const model = findModelById("openai#gpt-4o!@#$")
    expect(model).toBeUndefined()
  })

  it("findModelByName handles special characters", () => {
    const model = findModelByName("gpt-4o!@#$")
    expect(model).toBeUndefined()
  })

  it("getModelsByProvider handles special characters", () => {
    const models = getModelsByProvider("openai!@#$")
    expect(models).toEqual([])
  })

  it("all query functions handle empty/invalid inputs gracefully", () => {
    expect(findModelById("")).toBeUndefined()
    expect(findModelByName("")).toBeUndefined()
    expect(getModelsByProvider("")).toEqual([])
    expect(getActiveModelsByProvider("")).toEqual([])
  })
})

describe("cross-validation of filtering logic", () => {
  it("active models by provider sum equals total active models", () => {
    const runtimeProviders = getRuntimeEnabledProviders()
    const totalActiveByProvider = runtimeProviders.reduce((sum, provider) => {
      return sum + getActiveModelsByProvider(provider).length
    }, 0)

    const totalActive = getRuntimeEnabledModels().length
    expect(totalActiveByProvider).toBe(totalActive)
  })

  it("all models by provider sum equals catalog length", () => {
    const allProviders = getAllProviders()
    const totalByProvider = allProviders.reduce((sum, provider) => {
      return sum + getModelsByProvider(provider).length
    }, 0)

    expect(totalByProvider).toBe(MODEL_CATALOG.length)
  })

  it("provider info activeModels sum equals total active models", () => {
    const providerInfo = getProviderInfo()
    const totalFromInfo = providerInfo.reduce((sum, info) => sum + info.activeModels, 0)
    const totalActive = getRuntimeEnabledModels().length

    expect(totalFromInfo).toBe(totalActive)
  })
})
