import { describe, expect, it, vi } from "vitest"
import { MOCK_CATALOG } from "./fixtures/mock-catalog"

vi.mock("../llm-catalog/catalog", () => ({
  MODEL_CATALOG: MOCK_CATALOG,
}))

import { mapModelToTier, mapModelNameToEasyName } from "../tier-mapping"

describe("Tier Mapping", () => {
  describe("mapModelToTier", () => {
    it("prioritizes intelligence: smart (intelligence >= 8) overrides speed and cost", () => {
      const smartModel = MOCK_CATALOG.find(m => m.intelligence >= 8)
      if (!smartModel) throw new Error("Test setup: need smart model")
      expect(mapModelToTier(smartModel.id)).toBe("smart")

      const smartAndFast = MOCK_CATALOG.find(m => m.intelligence >= 8 && m.speed === "fast")
      if (smartAndFast) {
        expect(mapModelToTier(smartAndFast.id)).toBe("smart")
      }
    })

    it("prioritizes speed: fast overrides cheap when intelligence < 8", () => {
      const fastNotSmartModel = MOCK_CATALOG.find(m => m.speed === "fast" && m.intelligence < 8)
      if (!fastNotSmartModel) throw new Error("Test setup: need fast non-smart model")
      expect(mapModelToTier(fastNotSmartModel.id)).toBe("fast")

      const fastAndCheap = MOCK_CATALOG.find(m => m.intelligence < 8 && m.speed === "fast" && m.pricingTier === "low")
      if (fastAndCheap) {
        expect(mapModelToTier(fastAndCheap.id)).toBe("fast")
      }
    })

    it("correctly applies tier logic across all catalog models", () => {
      for (const model of MOCK_CATALOG) {
        const tier = mapModelToTier(model.id)

        if (model.intelligence >= 8) {
          expect(tier).toBe("smart")
        } else if (model.speed === "fast") {
          expect(tier).toBe("fast")
        } else if (model.pricingTier === "low") {
          expect(tier).toBe("cheap")
        } else {
          expect(tier).toBe("balanced")
        }
      }
    })

    it("returns balanced for unknown models", () => {
      expect(mapModelToTier("unknown#nonexistent")).toBe("balanced")
      expect(mapModelToTier("")).toBe("balanced")
      expect(mapModelToTier("malformed-id-without-hash")).toBe("balanced")
    })
  })

  describe("mapModelNameToEasyName", () => {
    it("behaves identically to mapModelToTier", () => {
      for (const model of MOCK_CATALOG.slice(0, 5)) {
        expect(mapModelNameToEasyName(model.id)).toBe(mapModelToTier(model.id))
      }

      expect(mapModelNameToEasyName("unknown#model")).toBe(mapModelToTier("unknown#model"))
    })
  })
})
