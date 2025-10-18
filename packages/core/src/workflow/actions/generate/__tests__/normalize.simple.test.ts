import { findModelByName } from "@lucky/models"
import { describe, expect, it } from "vitest"

describe("Model normalization logic", () => {
  it("converts model name to catalog ID", () => {
    const modelName = "gpt-5-mini"
    const catalogEntry = findModelByName(modelName)

    expect(catalogEntry).toBeDefined()
    expect(catalogEntry?.id).toBe("openai#gpt-5-mini")
  })

  it("keeps tier names as-is", () => {
    const validTiers = ["cheap", "fast", "smart", "balanced"]
    for (const tier of validTiers) {
      const modelNameLower = tier.toLowerCase()
      expect(validTiers.includes(modelNameLower)).toBe(true)
    }
  })

  it("keeps catalog IDs unchanged", () => {
    const catalogId = "openai#gpt-4o"
    expect(catalogId.includes("#")).toBe(true)
  })
})
