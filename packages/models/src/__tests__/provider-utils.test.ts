import { describe, expect, it, vi } from "vitest"
import { MOCK_CATALOG } from "./fixtures/mock-catalog"

vi.mock("../llm-catalog/catalog", () => ({
  MODEL_CATALOG: MOCK_CATALOG,
}))

import {
  FALLBACK_PROVIDER_KEYS,
  formatMissingProviders,
  getProviderDisplayName,
  getProviderKeyName,
  getRequiredProviderKeys,
  validateProviderKeys,
} from "../provider-utils"

describe("Provider Utils", () => {
  describe("getRequiredProviderKeys", () => {
    it("deduplicates multiple models from same provider", () => {
      const openaiModels = MOCK_CATALOG.filter(m => m.provider === "openai")
      if (openaiModels.length >= 2) {
        const keys = getRequiredProviderKeys(openaiModels.map(m => m.id))
        const openaiKeys = keys.filter(k => k.includes("OPENAI"))
        expect(openaiKeys.length).toBe(1)
      }
    })

    it("throws with all unknown models listed when models not in catalog", () => {
      const unknownModels = ["unknown#model1", "unknown#model2", "unknown#model3"]
      expect(() => getRequiredProviderKeys(unknownModels)).toThrow("not found in the catalog")

      try {
        getRequiredProviderKeys(unknownModels)
      } catch (error) {
        const errorMsg = String(error)
        expect(errorMsg).toContain("model1")
        expect(errorMsg).toContain("model2")
        expect(errorMsg).toContain("model3")
      }
    })

    it("auto-detects provider from unprefixed model name", () => {
      const firstModel = MOCK_CATALOG[0]
      const keysWithPrefix = getRequiredProviderKeys([firstModel.id])
      const keysWithoutPrefix = getRequiredProviderKeys([firstModel.model])
      expect(keysWithoutPrefix).toEqual(keysWithPrefix)
    })

    it("extracts keys from mixed provider models", () => {
      const providers = [...new Set(MOCK_CATALOG.map(m => m.provider))]
      if (providers.length >= 2) {
        const models = providers.slice(0, 2).map(p => MOCK_CATALOG.find(m => m.provider === p)!.id)
        const keys = getRequiredProviderKeys(models)
        expect(keys.length).toBeGreaterThanOrEqual(2)
      }
    })

    it("handles empty array", () => {
      expect(getRequiredProviderKeys([])).toEqual([])
    })
  })

  describe("getProviderKeyName", () => {
    it("returns uppercase API_KEY format", () => {
      const keyName = getProviderKeyName("openai")
      expect(keyName).toBe(keyName.toUpperCase())
      expect(keyName).toContain("API_KEY")
    })

    it("handles case-insensitive provider names consistently", () => {
      const lower = getProviderKeyName("openai")
      const upper = getProviderKeyName("OPENAI")
      const mixed = getProviderKeyName("OpenAI")
      expect(lower).toBe(upper)
      expect(lower).toBe(mixed)
    })

    it("generates fallback format for unknown providers", () => {
      const keyName = getProviderKeyName("unknown-provider-xyz")
      expect(keyName).toContain("API_KEY")
      expect(keyName).toContain("UNKNOWN")
    })
  })

  describe("getProviderDisplayName", () => {
    it("maps ANTHROPIC_API_KEY to Anthropic", () => {
      expect(getProviderDisplayName("ANTHROPIC_API_KEY")).toBe("Anthropic")
    })

    it("removes _API_KEY suffix and formats as Title Case", () => {
      expect(getProviderDisplayName("HUGGING_FACE_API_KEY")).toBe("Hugging Face")
      expect(getProviderDisplayName("MY_CUSTOM_AI_API_KEY")).toBe("My Custom Ai")
      expect(getProviderDisplayName("CUSTOM_PROVIDER_API_KEY")).toBe("Custom Provider")
    })
  })

  describe("validateProviderKeys", () => {
    it("returns empty when all required keys present", () => {
      const required = ["OPENAI_API_KEY", "GROQ_API_KEY"]
      const provided = {
        OPENAI_API_KEY: "sk-test",
        GROQ_API_KEY: "gsk-test",
      }
      expect(validateProviderKeys(required, provided)).toEqual([])
    })

    it("returns missing keys", () => {
      const required = ["OPENAI_API_KEY", "GROQ_API_KEY", "ANTHROPIC_API_KEY"]
      const provided = { OPENAI_API_KEY: "sk-test" }
      const missing = validateProviderKeys(required, provided)
      expect(missing).toContain("GROQ_API_KEY")
      expect(missing).toContain("ANTHROPIC_API_KEY")
      expect(missing).not.toContain("OPENAI_API_KEY")
    })

    it("treats undefined and empty string values as missing", () => {
      const required = ["OPENAI_API_KEY"]
      expect(validateProviderKeys(required, { OPENAI_API_KEY: undefined })).toContain("OPENAI_API_KEY")
      expect(validateProviderKeys(required, { OPENAI_API_KEY: "" })).toContain("OPENAI_API_KEY")
    })

    it("handles edge cases: empty required or provided", () => {
      expect(validateProviderKeys([], { OPENAI_API_KEY: "sk-test" })).toEqual([])
      expect(validateProviderKeys(["OPENAI_API_KEY"], {})).toEqual(["OPENAI_API_KEY"])
    })
  })

  describe("formatMissingProviders", () => {
    it("converts API keys to display names preserving order", () => {
      const missing = ["OPENAI_API_KEY", "GROQ_API_KEY", "ANTHROPIC_API_KEY"]
      const formatted = formatMissingProviders(missing)
      expect(formatted.length).toBe(3)
      expect(formatted[2]).toBe("Anthropic")
    })

    it("handles empty array", () => {
      expect(formatMissingProviders([])).toEqual([])
    })
  })

  describe("FALLBACK_PROVIDER_KEYS", () => {
    it("includes ANTHROPIC_API_KEY for legacy support", () => {
      expect(FALLBACK_PROVIDER_KEYS).toContain("ANTHROPIC_API_KEY")
    })
  })
})
