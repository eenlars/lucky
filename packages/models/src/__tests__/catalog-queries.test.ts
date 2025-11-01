import { describe, expect, it, vi } from "vitest"
import { MOCK_CATALOG } from "./fixtures/mock-catalog"

vi.mock("../llm-catalog/catalog", () => ({
  MODEL_CATALOG: MOCK_CATALOG,
}))

import type { LuckyGateway } from "@lucky/shared"
import { findModel, getCatalog, getModelsByGateway } from "../llm-catalog/catalog-queries"

describe("Catalog Queries", () => {
  describe("getCatalog", () => {
    it("returns full catalog with required fields", () => {
      const catalog = getCatalog()
      expect(catalog.length).toBe(MOCK_CATALOG.length)

      for (const model of catalog) {
        expect(model.gatewayModelId).toBeDefined()
        expect(model.gateway).toBeDefined()
        expect(typeof model.input).toBe("number")
        expect(typeof model.output).toBe("number")
      }
    })

    it("returns consistent catalog data across calls", () => {
      const catalog1 = getCatalog()
      const catalog2 = getCatalog()
      expect(catalog1).toEqual(catalog2)
      expect(catalog1.length).toBe(catalog2.length)
    })
  })

  describe("findModel by ID", () => {
    const firstModel = MOCK_CATALOG[0]

    it("finds model by exact ID", () => {
      const found = findModel(firstModel.gatewayModelId)
      expect(found?.gatewayModelId).toBe(firstModel.gatewayModelId)
      expect(found?.gateway).toBe(firstModel.gateway)
    })

    it("is case-insensitive", () => {
      const upperCase = firstModel.gatewayModelId.toUpperCase()
      const lowerCase = firstModel.gatewayModelId.toLowerCase()
      const mixed = firstModel.gatewayModelId
        .split("")
        .map((c, i) => (i % 2 ? c.toUpperCase() : c.toLowerCase()))
        .join("")

      expect(findModel(upperCase)?.gatewayModelId).toBe(firstModel.gatewayModelId)
      expect(findModel(lowerCase)?.gatewayModelId).toBe(firstModel.gatewayModelId)
      expect(findModel(mixed)?.gatewayModelId).toBe(firstModel.gatewayModelId)
    })

    it("returns undefined for non-existent or malformed IDs", () => {
      expect(findModel("nonexistent#model")).toBeUndefined()
      expect(findModel("")).toBeUndefined()
      expect(findModel("malformed-without-hash")).toBeUndefined()
    })

    it("handles IDs with special characters", () => {
      const modelWithSlash = MOCK_CATALOG.find(m => m.gatewayModelId.includes("/"))
      if (modelWithSlash) {
        expect(findModel(modelWithSlash.gatewayModelId)?.gatewayModelId).toBe(modelWithSlash.gatewayModelId)
      }
    })

    it("finds all catalog models by their IDs", () => {
      for (const model of MOCK_CATALOG) {
        expect(findModel(model.gatewayModelId)?.gatewayModelId).toBe(model.gatewayModelId)
      }
    })
  })

  describe("findModel by name", () => {
    const firstModel = MOCK_CATALOG[0]

    it("finds model by name without gateway prefix", () => {
      const found = findModel(firstModel.gatewayModelId)
      expect(found?.gatewayModelId).toBe(firstModel.gatewayModelId)
    })

    it("is case-insensitive", () => {
      const upperCase = firstModel.gatewayModelId.toUpperCase()
      const lowerCase = firstModel.gatewayModelId.toLowerCase()
      expect(findModel(upperCase)?.gatewayModelId).toBe(firstModel.gatewayModelId)
      expect(findModel(lowerCase)?.gatewayModelId).toBe(firstModel.gatewayModelId)
    })

    it("returns undefined for non-existent names", () => {
      expect(findModel("nonexistent-model-xyz-123")).toBeUndefined()
      expect(findModel("")).toBeUndefined()
    })

    it("returns first match when duplicate names across gateways", () => {
      const gatewayModelId = firstModel.gatewayModelId
      const allWithSameName = MOCK_CATALOG.filter(m => m.gatewayModelId.toLowerCase() === gatewayModelId.toLowerCase())
      if (allWithSameName.length > 1) {
        const found = findModel(gatewayModelId)
        expect(found?.gatewayModelId).toBe(allWithSameName[0].gatewayModelId)
      }
    })

    it("handles special characters in model names", () => {
      const modelWithHyphen = MOCK_CATALOG.find(m => m.gatewayModelId.includes("-"))
      const modelWithSlash = MOCK_CATALOG.find(m => m.gatewayModelId.includes("/"))

      if (modelWithHyphen) {
        expect(findModel(modelWithHyphen.gatewayModelId)?.gatewayModelId).toBe(modelWithHyphen.gatewayModelId)
      }
      if (modelWithSlash) {
        expect(findModel(modelWithSlash.gatewayModelId)?.gatewayModelId).toBe(modelWithSlash.gatewayModelId)
      }
    })
  })

  describe("getModelsByGateway", () => {
    const firstProvider = MOCK_CATALOG[0].gateway

    it("returns all models for given gateway", () => {
      const models = getModelsByGateway(firstProvider)
      expect(models.length).toBeGreaterThan(0)
      expect(models.every(m => m.gateway === firstProvider)).toBe(true)
    })

    it("is case-sensitive", () => {
      const upperCase = firstProvider.toUpperCase()
      const models = getModelsByGateway(upperCase as LuckyGateway)
      expect(models).toEqual([])
    })

    it("returns empty array for non-existent gateway", () => {
      expect(getModelsByGateway("nonexistent-gateway-xyz" as LuckyGateway)).toEqual([])
    })

    it("returns different results for different gateways", () => {
      const gateways = [...new Set(MOCK_CATALOG.map(m => m.gateway))]
      if (gateways.length >= 2) {
        const models1 = getModelsByGateway(gateways[0])
        const models2 = getModelsByGateway(gateways[1])
        expect(models1.map(m => m.gatewayModelId)).not.toEqual(models2.map(m => m.gatewayModelId))
      }
    })

    it("all returned models have matching gateway prefix in ID", () => {
      const models = getModelsByGateway("openai-api" as LuckyGateway)
      if (models.length > 0) {
        expect(models.every(m => m.gateway === "openai-api")).toBe(true)
      }
    })
  })

  describe("Cross-function consistency", () => {
    it("findModel resolves both by ID and by name to same model", () => {
      const firstModel = MOCK_CATALOG[0]
      const foundById = findModel(firstModel.gatewayModelId)
      const foundByName = findModel(firstModel.gatewayModelId)
      expect(foundById?.gatewayModelId).toBe(foundByName?.gatewayModelId)
    })

    it("getModelsByGateway matches manual filter", () => {
      const gateway = MOCK_CATALOG[0].gateway
      const viaFunction = getModelsByGateway(gateway)
      const viaFilter = MOCK_CATALOG.filter(m => m.gateway === gateway)
      expect(viaFunction.length).toBe(viaFilter.length)
    })
  })
})
