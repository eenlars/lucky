import { normalizeModelName } from "@lucky/models"
import { describe, expect, it } from "vitest"

describe("Model normalization logic", () => {
  it("converts model name to catalog ID", () => {
    const modelName = "gpt-5-mini"
    const normalized = normalizeModelName(modelName)

    expect(normalized).toBe("openai#gpt-5-mini")
  })

  it("keeps tier names as-is", () => {
    const validTiers = ["cheap", "fast", "smart", "balanced"]
    for (const tier of validTiers) {
      const normalized = normalizeModelName(tier)
      expect(normalized).toBe(tier)
    }
  })

  it("keeps catalog IDs unchanged", () => {
    const catalogId = "openai#gpt-4o"
    const normalized = normalizeModelName(catalogId)
    expect(normalized).toBe(catalogId)
  })

  it("migrates legacy tier names", () => {
    expect(normalizeModelName("medium")).toBe("balanced")
    expect(normalizeModelName("fallback")).toBe("balanced")
  })
})
