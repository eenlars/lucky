import { describe, expect, it } from "vitest"
import { formatModelType, isModelType, normalizeModelType, parseModelType, tryNormalizeModelType } from "./modelType"

describe("modelType", () => {
  describe("isModelType", () => {
    it("validates canonical catalog ID format", () => {
      expect(isModelType("openai#gpt-5")).toBe(true)
      expect(isModelType("openai#gpt-5-mini")).toBe(true)
      expect(isModelType("groq#llama-3.1-70b-versatile")).toBe(true)
    })

    it("rejects invalid formats", () => {
      expect(isModelType("")).toBe(false)
      expect(isModelType("gpt-4")).toBe(false)
      expect(isModelType("invalid")).toBe(false)
      expect(isModelType("anthropic#model")).toBe(false) // anthropic not a valid provider
      expect(isModelType(null)).toBe(false)
      expect(isModelType(undefined)).toBe(false)
    })
  })

  describe("formatModelType", () => {
    it("formats provider and model into canonical ID", () => {
      expect(formatModelType("openai", "gpt-5")).toBe("openai#gpt-5")
      expect(formatModelType("openai", "gpt-5-mini")).toBe("openai#gpt-5-mini")
    })
  })

  describe("tryNormalizeModelType", () => {
    it("returns undefined for null/undefined input", () => {
      expect(tryNormalizeModelType(null)).toBeUndefined()
      expect(tryNormalizeModelType(undefined)).toBeUndefined()
      expect(tryNormalizeModelType("")).toBeUndefined()
    })

    it("validates canonical catalog IDs against the catalog", () => {
      // Valid canonical ID that exists in catalog should work
      const validResult = tryNormalizeModelType("openai#gpt-5-mini")
      expect(validResult).toBeDefined()
      expect(validResult).toContain("#")
    })

    it("rejects canonical IDs that don't exist in catalog", () => {
      // Invalid canonical ID format that looks valid but doesn't exist
      expect(tryNormalizeModelType("fakeprovider#fakemodel")).toBeUndefined()
      expect(tryNormalizeModelType("openai#nonexistent-model")).toBeUndefined()
      expect(tryNormalizeModelType("openai#fake-gpt")).toBeUndefined()
    })

    it("normalizes API-format model names to canonical IDs", () => {
      // API format should be normalized to canonical ID
      const result = tryNormalizeModelType("gpt-5-mini")
      expect(result).toBeDefined()
      expect(result).toBe("openai#gpt-5-mini")
    })

    it("handles case-insensitive lookups", () => {
      // Model lookup should be case-insensitive
      const lowerResult = tryNormalizeModelType("gpt-5-mini")
      const upperResult = tryNormalizeModelType("GPT-5-MINI")

      expect(lowerResult).toBeDefined()
      expect(upperResult).toBeDefined()
      expect(lowerResult).toBe(upperResult)
    })
  })

  describe("normalizeModelType", () => {
    it("throws for non-existent models", () => {
      expect(() => normalizeModelType("fakeprovider#fakemodel")).toThrow(
        "Unable to normalize model type: fakeprovider#fakemodel",
      )
      expect(() => normalizeModelType("nonexistent-model")).toThrow()
    })

    it("normalizes valid models without throwing", () => {
      expect(() => normalizeModelType("gpt-5-mini")).not.toThrow()
      expect(normalizeModelType("gpt-5-mini")).toBe("openai#gpt-5-mini")
    })
  })

  describe("parseModelType", () => {
    it("parses canonical catalog IDs into provider and model", () => {
      const result1 = parseModelType("openai#gpt-5-mini")
      expect(result1).toEqual({
        provider: "openai",
        model: "gpt-5-mini",
      })

      const result2 = parseModelType("openai#gpt-5")
      expect(result2).toEqual({
        provider: "openai",
        model: "gpt-5",
      })
    })

    it("throws for invalid model types", () => {
      expect(() => parseModelType("fakeprovider#fakemodel")).toThrow("Invalid model type")
      expect(() => parseModelType("invalid")).toThrow()
    })

    it("normalizes API format before parsing", () => {
      const result = parseModelType("gpt-5-mini")
      expect(result).toEqual({
        provider: "openai",
        model: "gpt-5-mini",
      })
    })
  })
})
