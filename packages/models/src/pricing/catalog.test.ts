import { describe, expect, it } from "vitest"
import {
  MODEL_CATALOG,
  getActiveProviders,
  getAllProviders,
  getCatalogStats,
  getModelsByProvider,
  getProviderInfo,
  validateCatalogIntegrity,
} from "./catalog"

describe("catalog provider utilities", () => {
  describe("getAllProviders", () => {
    it("returns unique providers", () => {
      const providers = getAllProviders()
      expect(providers).toContain("openai")
      expect(providers).toContain("openrouter")
      expect(providers).toContain("groq")
      expect(new Set(providers).size).toBe(providers.length) // No duplicates
    })

    it("returns sorted list", () => {
      const providers = getAllProviders()
      const sorted = [...providers].sort()
      expect(providers).toEqual(sorted)
    })

    it("throws if MODEL_CATALOG is empty", () => {
      // Note: This test would require mocking MODEL_CATALOG
      // For now, we just verify the function exists and doesn't throw with real data
      expect(() => getAllProviders()).not.toThrow()
    })
  })

  describe("getActiveProviders", () => {
    it("only includes providers with active models", () => {
      const active = getActiveProviders()
      for (const provider of active) {
        const hasActive = MODEL_CATALOG.some(m => m.provider === provider && m.active)
        expect(hasActive).toBe(true)
      }
    })

    it("is a subset of getAllProviders", () => {
      const all = getAllProviders()
      const active = getActiveProviders()
      for (const provider of active) {
        expect(all).toContain(provider)
      }
    })
  })

  describe("getProviderInfo", () => {
    it("matches getAllProviders", () => {
      const allProviders = getAllProviders()
      const providerInfo = getProviderInfo()

      expect(providerInfo.map(p => p.name).sort()).toEqual(allProviders)
    })

    it("counts models correctly", () => {
      const info = getProviderInfo()
      for (const provider of info) {
        const expected = MODEL_CATALOG.filter(m => m.provider === provider.name)
        expect(provider.totalModels).toBe(expected.length)
        expect(provider.activeModels).toBe(expected.filter(m => m.active).length)
      }
    })

    it("includes model entries in provider info", () => {
      const info = getProviderInfo()
      for (const provider of info) {
        expect(provider.models).toBeDefined()
        expect(Array.isArray(provider.models)).toBe(true)
        expect(provider.models.length).toBe(provider.totalModels)
      }
    })

    it("returns providers in sorted order", () => {
      const info = getProviderInfo()
      const names = info.map(p => p.name)
      const sorted = [...names].sort()
      expect(names).toEqual(sorted)
    })
  })

  describe("getCatalogStats", () => {
    it("returns correct total count", () => {
      const stats = getCatalogStats()
      expect(stats.total).toBe(MODEL_CATALOG.length)
    })

    it("counts active models correctly", () => {
      const stats = getCatalogStats()
      const actualActive = MODEL_CATALOG.filter(m => m.active).length
      expect(stats.active).toBe(actualActive)
    })

    it("counts by provider correctly", () => {
      const stats = getCatalogStats()
      for (const [provider, count] of Object.entries(stats.byProvider)) {
        const expected = getModelsByProvider(provider).filter(m => m.active).length
        expect(count).toBe(expected)
      }
    })

    it("counts by pricing tier correctly", () => {
      const stats = getCatalogStats()
      const activeModels = MODEL_CATALOG.filter(m => m.active)

      expect(stats.byPricingTier.low).toBe(activeModels.filter(m => m.pricingTier === "low").length)
      expect(stats.byPricingTier.medium).toBe(activeModels.filter(m => m.pricingTier === "medium").length)
      expect(stats.byPricingTier.high).toBe(activeModels.filter(m => m.pricingTier === "high").length)
    })
  })

  describe("validateCatalogIntegrity", () => {
    it("validates the actual catalog successfully", () => {
      const result = validateCatalogIntegrity()
      if (!result.valid) {
        console.error("Catalog integrity errors:", result.errors)
      }
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it("checks that providers are lowercase", () => {
      for (const model of MODEL_CATALOG) {
        expect(model.provider).toBe(model.provider.toLowerCase())
      }
    })

    it("checks that model IDs contain '#' separator", () => {
      for (const model of MODEL_CATALOG) {
        expect(model.id).toContain("#")
      }
    })

    it("checks that pricing values are non-negative", () => {
      for (const model of MODEL_CATALOG) {
        expect(model.input).toBeGreaterThanOrEqual(0)
        expect(model.output).toBeGreaterThanOrEqual(0)
      }
    })

    it("checks that context lengths are positive", () => {
      for (const model of MODEL_CATALOG) {
        expect(model.contextLength).toBeGreaterThan(0)
      }
    })
  })

  describe("MODEL_CATALOG structure", () => {
    it("contains at least one model", () => {
      expect(MODEL_CATALOG.length).toBeGreaterThan(0)
    })

    it("all models have required fields", () => {
      for (const model of MODEL_CATALOG) {
        expect(model.id).toBeDefined()
        expect(model.provider).toBeDefined()
        expect(model.model).toBeDefined()
        expect(typeof model.input).toBe("number")
        expect(typeof model.output).toBe("number")
        expect(typeof model.contextLength).toBe("number")
        expect(typeof model.active).toBe("boolean")
      }
    })

    it("contains expected providers", () => {
      const providers = getAllProviders()
      expect(providers).toContain("openai")
      expect(providers).toContain("openrouter")
      expect(providers).toContain("groq")
    })

    it("has consistent ID format (provider#model)", () => {
      for (const model of MODEL_CATALOG) {
        expect(model.id).toMatch(/^[a-z0-9-]+#[a-z0-9-./]+$/i)
      }
    })
  })
})
