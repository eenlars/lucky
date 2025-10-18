import { describe, expect, it, vi } from "vitest"
import { MOCK_CATALOG } from "./fixtures/mock-catalog"

vi.mock("../llm-catalog/catalog", () => ({
  MODEL_CATALOG: MOCK_CATALOG,
}))

import { findModelById, findModelByName, getCatalog, getModelsByProvider } from "../llm-catalog/catalog-queries"

describe("Catalog Queries", () => {
  describe("getCatalog", () => {
    it("returns full catalog with required fields", () => {
      const catalog = getCatalog()
      expect(catalog.length).toBe(MOCK_CATALOG.length)

      for (const model of catalog) {
        expect(model.id).toBeDefined()
        expect(model.provider).toBeDefined()
        expect(model.model).toBeDefined()
        expect(typeof model.input).toBe("number")
        expect(typeof model.output).toBe("number")
      }
    })

    it("returns consistent reference across calls", () => {
      const catalog1 = getCatalog()
      const catalog2 = getCatalog()
      expect(catalog1).toEqual(catalog2)
    })
  })

  describe("findModelById", () => {
    const firstModel = MOCK_CATALOG[0]

    it("finds model by exact ID", () => {
      const found = findModelById(firstModel.id)
      expect(found?.id).toBe(firstModel.id)
      expect(found?.provider).toBe(firstModel.provider)
      expect(found?.model).toBe(firstModel.model)
    })

    it("is case-insensitive", () => {
      const upperCase = firstModel.id.toUpperCase()
      const lowerCase = firstModel.id.toLowerCase()
      const mixed = firstModel.id
        .split("")
        .map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase()))
        .join("")

      expect(findModelById(upperCase)?.id).toBe(firstModel.id)
      expect(findModelById(lowerCase)?.id).toBe(firstModel.id)
      expect(findModelById(mixed)?.id).toBe(firstModel.id)
    })

    it("returns undefined for non-existent or malformed IDs", () => {
      expect(findModelById("nonexistent#model")).toBeUndefined()
      expect(findModelById("")).toBeUndefined()
      expect(findModelById("malformed-without-hash")).toBeUndefined()
    })

    it("handles IDs with special characters", () => {
      const modelWithSlash = MOCK_CATALOG.find(m => m.id.includes("/"))
      if (modelWithSlash) {
        expect(findModelById(modelWithSlash.id)?.id).toBe(modelWithSlash.id)
      }
    })

    it("finds all catalog models by their IDs", () => {
      for (const model of MOCK_CATALOG) {
        expect(findModelById(model.id)?.id).toBe(model.id)
      }
    })
  })

  describe("findModelByName", () => {
    const firstModel = MOCK_CATALOG[0]

    it("finds model by name without provider prefix", () => {
      const found = findModelByName(firstModel.model)
      expect(found?.model).toBe(firstModel.model)
    })

    it("is case-insensitive", () => {
      const upperCase = firstModel.model.toUpperCase()
      const lowerCase = firstModel.model.toLowerCase()
      expect(findModelByName(upperCase)?.model).toBe(firstModel.model)
      expect(findModelByName(lowerCase)?.model).toBe(firstModel.model)
    })

    it("returns undefined for non-existent names", () => {
      expect(findModelByName("nonexistent-model-xyz-123")).toBeUndefined()
      expect(findModelByName("")).toBeUndefined()
    })

    it("returns first match when duplicate names across providers", () => {
      const modelName = firstModel.model
      const allWithSameName = MOCK_CATALOG.filter(m => m.model.toLowerCase() === modelName.toLowerCase())
      if (allWithSameName.length > 1) {
        const found = findModelByName(modelName)
        expect(found?.model).toBe(allWithSameName[0].model)
      }
    })

    it("handles special characters in model names", () => {
      const modelWithHyphen = MOCK_CATALOG.find(m => m.model.includes("-"))
      const modelWithSlash = MOCK_CATALOG.find(m => m.model.includes("/"))

      if (modelWithHyphen) {
        expect(findModelByName(modelWithHyphen.model)?.model).toBe(modelWithHyphen.model)
      }
      if (modelWithSlash) {
        expect(findModelByName(modelWithSlash.model)?.model).toBe(modelWithSlash.model)
      }
    })
  })

  describe("getModelsByProvider", () => {
    const firstProvider = MOCK_CATALOG[0].provider

    it("returns all models for given provider", () => {
      const models = getModelsByProvider(firstProvider)
      expect(models.length).toBeGreaterThan(0)
      expect(models.every(m => m.provider === firstProvider)).toBe(true)
    })

    it("is case-sensitive", () => {
      const upperCase = firstProvider.toUpperCase()
      const models = getModelsByProvider(upperCase)
      expect(models).toEqual([])
    })

    it("returns empty array for non-existent provider", () => {
      expect(getModelsByProvider("nonexistent-provider-xyz")).toEqual([])
    })

    it("returns different results for different providers", () => {
      const providers = [...new Set(MOCK_CATALOG.map(m => m.provider))]
      if (providers.length >= 2) {
        const models1 = getModelsByProvider(providers[0])
        const models2 = getModelsByProvider(providers[1])
        expect(models1.map(m => m.id)).not.toEqual(models2.map(m => m.id))
      }
    })

    it("all returned models have matching provider prefix in ID", () => {
      const models = getModelsByProvider("openai")
      if (models.length > 0) {
        expect(models.every(m => m.id.startsWith("openai#"))).toBe(true)
      }
    })
  })

  describe("Cross-function consistency", () => {
    it("findModelById and findModelByName resolve to same model", () => {
      const firstModel = MOCK_CATALOG[0]
      const foundById = findModelById(firstModel.id)
      const foundByName = findModelByName(firstModel.model)
      expect(foundById?.model).toBe(foundByName?.model)
    })

    it("getModelsByProvider matches manual filter", () => {
      const provider = MOCK_CATALOG[0].provider
      const viaFunction = getModelsByProvider(provider)
      const viaFilter = MOCK_CATALOG.filter(m => m.provider === provider)
      expect(viaFunction.length).toBe(viaFilter.length)
    })
  })
})
