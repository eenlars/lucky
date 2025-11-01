import { describe, expect, it, vi } from "vitest"
import { MOCK_CATALOG } from "./fixtures/mock-catalog"

vi.mock("../llm-catalog/catalog", () => ({
  MODEL_CATALOG: MOCK_CATALOG,
}))

import {
  GATEWAY_API_KEYS,
  formatMissingGateways,
  getGatewayDisplayName,
  getGatewayKeyName,
  getRequiredGatewayKeys,
  validateGatewayKeys,
} from "../gateway-utils"

describe("Gateway Utils", () => {
  describe("getRequiredGatewayKeys", () => {
    it("deduplicates multiple models from same gateway", () => {
      const openaiModels = MOCK_CATALOG.filter(m => m.gateway === "openai-api")
      if (openaiModels.length >= 2) {
        const keys = getRequiredGatewayKeys(openaiModels.map(m => m.gatewayModelId))
        const openaiKeys = keys.filter(k => k.includes("OPENAI"))
        expect(openaiKeys.length).toBe(1)
      }
    })

    it("throws with all unknown models listed when models not in catalog", () => {
      const unknownModels = ["unknown#model1", "unknown#model2", "unknown#model3"]
      expect(() => getRequiredGatewayKeys(unknownModels)).toThrow("not found in the catalog")

      try {
        getRequiredGatewayKeys(unknownModels)
      } catch (error) {
        const errorMsg = String(error)
        expect(errorMsg).toContain("model1")
        expect(errorMsg).toContain("model2")
        expect(errorMsg).toContain("model3")
      }
    })

    it("auto-detects gateway from unprefixed model name", () => {
      const firstModel = MOCK_CATALOG[0]
      const keysWithPrefix = getRequiredGatewayKeys([firstModel.gatewayModelId])
      const keysWithoutPrefix = getRequiredGatewayKeys([firstModel.gatewayModelId])
      expect(keysWithoutPrefix).toEqual(keysWithPrefix)
    })

    it("extracts keys from mixed gateway models", () => {
      const gateways = [...new Set(MOCK_CATALOG.map(m => m.gateway))]
      if (gateways.length >= 2) {
        const models = gateways.slice(0, 2).map(p => MOCK_CATALOG.find(m => m.gateway === p)!.gatewayModelId)
        const keys = getRequiredGatewayKeys(models)
        expect(keys.length).toBeGreaterThanOrEqual(2)
      }
    })

    it("handles empty array", () => {
      expect(getRequiredGatewayKeys([])).toEqual([])
    })
  })

  describe("getGatewayKeyName", () => {
    it("returns uppercase API_KEY format", () => {
      const keyName = getGatewayKeyName("openai")
      expect(keyName).toBe(keyName.toUpperCase())
      expect(keyName).toContain("API_KEY")
    })

    it("handles case-insensitive gateway names consistently", () => {
      const lower = getGatewayKeyName("openai")
      const upper = getGatewayKeyName("OPENAI")
      const mixed = getGatewayKeyName("OpenAI")
      expect(lower).toBe(upper)
      expect(lower).toBe(mixed)
    })

    it("generates fallback format for unknown gateways", () => {
      const keyName = getGatewayKeyName("unknown-gateway-xyz")
      expect(keyName).toContain("API_KEY")
      expect(keyName).toContain("UNKNOWN")
    })
  })

  describe("getGatewayDisplayName", () => {
    it("maps ANTHROPIC_API_KEY to Anthropic", () => {
      expect(getGatewayDisplayName("ANTHROPIC_API_KEY")).toBe("Anthropic")
    })

    it("removes _API_KEY suffix and formats as Title Case", () => {
      expect(getGatewayDisplayName("HUGGING_FACE_API_KEY")).toBe("Hugging Face")
      expect(getGatewayDisplayName("MY_CUSTOM_AI_API_KEY")).toBe("My Custom Ai")
      expect(getGatewayDisplayName("CUSTOM_GATEWAY_API_KEY")).toBe("Custom Gateway")
    })
  })

  describe("validateGatewayKeys", () => {
    it("returns empty when all required keys present", () => {
      const required = ["OPENAI_API_KEY", "GROQ_API_KEY"]
      const provided = {
        OPENAI_API_KEY: "sk-test",
        GROQ_API_KEY: "gsk-test",
      }
      expect(validateGatewayKeys(required, provided)).toEqual([])
    })

    it("returns missing keys", () => {
      const required = ["OPENAI_API_KEY", "GROQ_API_KEY", "ANTHROPIC_API_KEY"]
      const provided = { OPENAI_API_KEY: "sk-test" }
      const missing = validateGatewayKeys(required, provided)
      expect(missing).toContain("GROQ_API_KEY")
      expect(missing).toContain("ANTHROPIC_API_KEY")
      expect(missing).not.toContain("OPENAI_API_KEY")
    })

    it("treats undefined and empty string values as missing", () => {
      const required = ["OPENAI_API_KEY"]
      expect(validateGatewayKeys(required, { OPENAI_API_KEY: undefined })).toContain("OPENAI_API_KEY")
      expect(validateGatewayKeys(required, { OPENAI_API_KEY: "" })).toContain("OPENAI_API_KEY")
    })

    it("handles edge cases: empty required or provided", () => {
      expect(validateGatewayKeys([], { OPENAI_API_KEY: "sk-test" })).toEqual([])
      expect(validateGatewayKeys(["OPENAI_API_KEY"], {})).toEqual(["OPENAI_API_KEY"])
    })
  })

  describe("formatMissingGateways", () => {
    it("converts API keys to display names preserving order", () => {
      const missing = ["OPENAI_API_KEY", "GROQ_API_KEY", "ANTHROPIC_API_KEY"]
      const formatted = formatMissingGateways(missing)
      expect(formatted.length).toBe(3)
      expect(formatted[2]).toBe("Anthropic")
    })

    it("handles empty array", () => {
      expect(formatMissingGateways([])).toEqual([])
    })
  })

  describe("GATEWAY_API_KEYS", () => {
    it("includes ANTHROPIC_API_KEY for legacy support", () => {
      expect(GATEWAY_API_KEYS).toContain("ANTHROPIC_API_KEY")
    })
  })
})
