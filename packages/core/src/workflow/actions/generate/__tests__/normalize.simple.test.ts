import { findModel, findTierModels } from "@lucky/models"
import { describe, expect, it } from "vitest"

describe("Model normalization logic", () => {
  it("converts model name to catalog ID", () => {
    const gatewayModelId = "gpt-5-mini"
    const normalized = findModel(gatewayModelId)

    expect(normalized?.gatewayModelId).toBe("gpt-5-mini")
  })

  it("keeps tier names as-is", () => {
    const validTiers = ["cheap", "fast", "smart", "balanced"]
    for (const tier of validTiers) {
      const normalized = findTierModels(tier)
      expect(normalized).toBe(tier)
    }
  })

  it("keeps catalog IDs unchanged", () => {
    const catalogId = "gpt-4o"
    const normalized = findModel(catalogId)
    expect(normalized?.gatewayModelId).toBe(catalogId)
  })

  it("migrates legacy tier names", () => {
    expect(findTierModels("medium")).toBe("balanced")
    expect(findTierModels("fallback")).toBe("balanced")
  })
})
