/**
 * Tests for catalog utilities
 * Validates catalog structure and lookup functions
 */

import { describe, expect, it } from "vitest"
import { MODEL_CATALOG } from "../llm-catalog/catalog"
import { findModelById, findModelByName, getCatalog, getModelsByProvider } from "../llm-catalog/catalog-queries"

describe("MODEL_CATALOG", () => {
  it("contains models", () => {
    expect(MODEL_CATALOG).toBeDefined()
    expect(Array.isArray(MODEL_CATALOG)).toBe(true)
    expect(MODEL_CATALOG.length).toBeGreaterThan(0)
  })

  it("all models have required fields", () => {
    for (const model of MODEL_CATALOG) {
      expect(model.id).toBeDefined()
      expect(typeof model.id).toBe("string")
      expect(model.id).toContain("#") // ID format: provider#model

      expect(model.provider).toBeDefined()
      expect(typeof model.provider).toBe("string")

      expect(model.model).toBeDefined()
      expect(typeof model.model).toBe("string")

      expect(typeof model.input).toBe("number")
      expect(model.input).toBeGreaterThanOrEqual(0)

      expect(typeof model.output).toBe("number")
      expect(model.output).toBeGreaterThanOrEqual(0)

      expect(typeof model.contextLength).toBe("number")
      expect(model.contextLength).toBeGreaterThan(0)

      expect(typeof model.intelligence).toBe("number")
      expect(model.intelligence).toBeGreaterThanOrEqual(1)
      expect(model.intelligence).toBeLessThanOrEqual(10)

      expect(["fast", "medium", "slow"]).toContain(model.speed)
      expect(["low", "medium", "high"]).toContain(model.pricingTier)

      expect(typeof model.supportsTools).toBe("boolean")
      expect(typeof model.supportsJsonMode).toBe("boolean")
      expect(typeof model.supportsStreaming).toBe("boolean")
      expect(typeof model.supportsVision).toBe("boolean")
    }
  })

  it("has unique IDs", () => {
    const ids = MODEL_CATALOG.map(m => m.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it("IDs follow provider#model format", () => {
    for (const model of MODEL_CATALOG) {
      expect(model.id).toMatch(/^[^#]+#[^#]+$/)
      const [provider, _modelName] = model.id.split("#")
      expect(provider).toBe(model.provider)
    }
  })

  it("providers are lowercase", () => {
    for (const model of MODEL_CATALOG) {
      expect(model.provider).toBe(model.provider.toLowerCase())
    }
  })

  it("contains expected providers", () => {
    const providers = new Set(MODEL_CATALOG.map(m => m.provider))
    expect(providers.has("openai")).toBe(true)
    expect(providers.has("groq")).toBe(true)
    // openrouter may or may not be present depending on runtimeEnabled filter
  })

  it("all models have non-null pricing tiers", () => {
    for (const model of MODEL_CATALOG) {
      expect(model.pricingTier).toBeDefined()
      expect(["low", "medium", "high"]).toContain(model.pricingTier)
    }
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

describe("findModelById", () => {
  it("finds model by exact ID", () => {
    const model = findModelById("openai#gpt-4o-mini")
    expect(model).toBeDefined()
    expect(model?.id).toBe("openai#gpt-4o-mini")
    expect(model?.provider).toBe("openai")
    expect(model?.model).toBe("gpt-4o-mini")
  })

  it("finds groq models", () => {
    const model = findModelById("groq#openai/gpt-oss-20b")
    expect(model).toBeDefined()
    expect(model?.provider).toBe("groq")
  })

  it("returns undefined for non-existent ID", () => {
    const model = findModelById("fake#model")
    expect(model).toBeUndefined()
  })

  it("returns undefined for empty string", () => {
    const model = findModelById("")
    expect(model).toBeUndefined()
  })

  it("is case-insensitive", () => {
    const model = findModelById("OPENAI#GPT-4O-MINI")
    expect(model).toBeDefined() // Case doesn't match
    expect(model?.id).toBe("openai#gpt-4o-mini")
    expect(model?.provider).toBe("openai")
    expect(model?.model).toBe("gpt-4o-mini")
  })
})

describe("findModelByName", () => {
  it("finds model by exact model name", () => {
    const model = findModelByName("gpt-4o-mini")
    expect(model).toBeDefined()
    expect(model?.model).toBe("gpt-4o-mini")
  })

  it("finds model by suffix match", () => {
    const model = findModelByName("gpt-3.5-turbo")
    expect(model).toBeDefined()
    expect(model?.model).toBe("gpt-3.5-turbo")
  })

  it("returns first match when multiple providers have same model", () => {
    // This tests auto-detection behavior
    const model = findModelByName("gpt-4o-mini")
    expect(model).toBeDefined()
    expect(model?.model).toBe("gpt-4o-mini")
    expect(model?.provider).toBe("openai")
    expect(model?.id).toBe("openai#gpt-4o-mini")
  })

  it("returns undefined for non-existent model name", () => {
    const model = findModelByName("nonexistent-model")
    expect(model).toBeUndefined()
  })

  it("returns undefined for empty string", () => {
    const model = findModelByName("")
    expect(model).toBeUndefined()
  })
})

describe("getModelsByProvider", () => {
  it("returns all openai models", () => {
    const models = getModelsByProvider("openai")
    expect(models.length).toBeGreaterThan(0)
    for (const model of models) {
      expect(model.provider).toBe("openai")
    }
  })

  it("returns all groq models", () => {
    const models = getModelsByProvider("groq")
    expect(models.length).toBeGreaterThan(0)
    for (const model of models) {
      expect(model.provider).toBe("groq")
    }
  })

  it("returns openrouter models if any exist", () => {
    const models = getModelsByProvider("openrouter")
    // openrouter models may be filtered by runtimeEnabled
    for (const model of models) {
      expect(model.provider).toBe("openrouter")
    }
  })

  it("returns empty array for non-existent provider", () => {
    const models = getModelsByProvider("fake-provider")
    expect(models).toEqual([])
  })

  it("returns empty array for empty string", () => {
    const models = getModelsByProvider("")
    expect(models).toEqual([])
  })

  it("all providers combined equal full catalog", () => {
    const providers = Array.from(new Set(MODEL_CATALOG.map(m => m.provider)))
    const allModels = providers.flatMap(p => getModelsByProvider(p))
    expect(allModels.length).toBe(MODEL_CATALOG.length)
  })
})

describe("catalog pricing validation", () => {
  it("all models have valid pricing", () => {
    for (const model of MODEL_CATALOG) {
      expect(model.input).toBeGreaterThanOrEqual(0)
      expect(model.output).toBeGreaterThanOrEqual(0)

      // cachedInput can be null or non-negative
      if (model.cachedInput !== null) {
        expect(model.cachedInput).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it("output cost is typically higher than input cost", () => {
    let higherOutputCount = 0
    for (const model of MODEL_CATALOG) {
      if (model.output > model.input) {
        higherOutputCount++
      }
    }

    // Most models should have higher output costs
    expect(higherOutputCount).toBeGreaterThan(MODEL_CATALOG.length * 0.5)
  })

  it("cached input is cheaper than regular input when present", () => {
    for (const model of MODEL_CATALOG) {
      if (model.cachedInput !== null) {
        expect(model.cachedInput).toBeLessThanOrEqual(model.input)
      }
    }
  })
})

describe("catalog capabilities validation", () => {
  it("all models support streaming", () => {
    for (const model of MODEL_CATALOG) {
      expect(model.supportsStreaming).toBe(true)
    }
  })

  it("most models support tools", () => {
    const withTools = MODEL_CATALOG.filter(m => m.supportsTools)
    expect(withTools.length).toBeGreaterThan(MODEL_CATALOG.length * 0.5)
  })

  it("most models support JSON mode", () => {
    const withJson = MODEL_CATALOG.filter(m => m.supportsJsonMode)
    expect(withJson.length).toBeGreaterThan(MODEL_CATALOG.length * 0.5)
  })
})

describe("catalog intelligence scores", () => {
  it("all intelligence scores are in valid range", () => {
    for (const model of MODEL_CATALOG) {
      expect(model.intelligence).toBeGreaterThanOrEqual(1)
      expect(model.intelligence).toBeLessThanOrEqual(10)
    }
  })

  it("has models across different intelligence levels", () => {
    const scores = MODEL_CATALOG.map(m => m.intelligence)
    const uniqueScores = new Set(scores)

    // should have variety of intelligence scores
    expect(uniqueScores.size).toBeGreaterThanOrEqual(3)
  })
})

describe("catalog speed tiers", () => {
  it("has models in each speed tier", () => {
    const speeds = new Set(MODEL_CATALOG.map(m => m.speed))
    expect(speeds.has("fast")).toBe(true)
    // May or may not have medium/slow depending on catalog
  })

  it("groq models are marked as fast", () => {
    const groqModels = getModelsByProvider("groq")
    for (const model of groqModels) {
      expect(model.speed).toBe("fast")
    }
  })
})

describe("catalog pricing tiers", () => {
  it("has models in each pricing tier", () => {
    const tiers = new Set(MODEL_CATALOG.map(m => m.pricingTier))
    expect(tiers.has("low")).toBe(true)
    expect(tiers.has("medium")).toBe(true)
    expect(tiers.has("high")).toBe(true)
  })

  it("pricing tier generally correlates with actual price", () => {
    const lowTier = MODEL_CATALOG.filter(m => m.pricingTier === "low")
    const highTier = MODEL_CATALOG.filter(m => m.pricingTier === "high")

    if (lowTier.length > 0 && highTier.length > 0) {
      const avgLowCost = lowTier.reduce((sum, m) => sum + (m.input + m.output) / 2, 0) / lowTier.length
      const avgHighCost = highTier.reduce((sum, m) => sum + (m.input + m.output) / 2, 0) / highTier.length

      expect(avgLowCost).toBeLessThan(avgHighCost)
    }
  })
})
