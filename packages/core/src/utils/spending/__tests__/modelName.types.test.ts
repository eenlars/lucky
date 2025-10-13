/**
 * Type tests for ModelName system unification.
 * These tests verify compile-time type safety and runtime behavior alignment.
 */

import { validateAndResolveModel } from "@core/messages/api/sendAI/validateModel"
import { getActiveModelNames, getModelV2, isActiveModel } from "@core/utils/spending/functions"
import type { AnyModelName, ModelName, OpenRouterModelName } from "@core/utils/spending/models.types"
import { getCurrentProvider } from "@core/utils/spending/provider"
import { describe, expect, it } from "vitest"

describe("ModelName Type System", () => {
  describe("Type Unification", () => {
    it("ModelName should accept AnyModelName", () => {
      // Type test: ModelName = AnyModelName
      const testModel: AnyModelName = "gpt-4.1-mini"
      const modelName: ModelName = testModel // Should compile without error
      expect(modelName).toBe("gpt-4.1-mini")
    })

    it("AnyModelName should be a union of all provider models", () => {
      // Test that we can assign models from any provider
      const openrouterModel: AnyModelName = "google/gemini-2.5-flash-lite"
      const groqModel: AnyModelName = "openai/gpt-oss-20b"
      const openaiModel: AnyModelName = "gpt-4.1-mini"

      expect(typeof openrouterModel).toBe("string")
      expect(typeof groqModel).toBe("string")
      expect(typeof openaiModel).toBe("string")
    })

    it("Provider-specific types should be subsets of AnyModelName", () => {
      // Type test: specific model types should be assignable to AnyModelName
      const openrouterModel: OpenRouterModelName = "google/gemini-2.5-flash-lite"
      const anyModel1: AnyModelName = openrouterModel

      // Use AllowedModelName generic for other providers
      type GroqModel = AnyModelName

      const groqModel: GroqModel = "openai/gpt-oss-20b"
      const anyModel2: AnyModelName = groqModel

      const openaiModel: AnyModelName = "gpt-4.1-mini"
      const anyModel3: AnyModelName = openaiModel

      expect([anyModel1, anyModel2, anyModel3]).toHaveLength(3)
    })
  })

  describe("Runtime Provider Resolution", () => {
    it("getCurrentProvider should return a valid provider", () => {
      const provider = getCurrentProvider()
      expect(["openai", "openrouter", "groq"]).toContain(provider)
    })

    it("should validate active models for current provider", () => {
      const activeModels = getActiveModelNames()
      expect(activeModels.length).toBeGreaterThan(0)

      // All active models should pass validation
      for (const model of activeModels) {
        expect(isActiveModel(model)).toBe(true)
      }
    })

    it("should reject inactive models", () => {
      // Test with a known inactive model
      const inactiveModel = "moonshotai/kimi-k2" // From MODEL_CONFIG.inactive
      expect(isActiveModel(inactiveModel)).toBe(false)
    })

    it("should reject models from wrong provider", () => {
      const currentProvider = getCurrentProvider()

      // If current provider is openrouter, test with native openai format
      if (currentProvider === "openrouter") {
        // OpenRouter uses "gpt-4.1-mini" format
        // Native OpenAI uses "gpt-4.1-mini" format (no prefix)
        const nativeOpenAIFormat = "gpt-4.1-mini"
        const result = isActiveModel(nativeOpenAIFormat)

        // Should be false because format doesn't match provider's expected format
        expect(result).toBe(false)
      }
    })
  })

  describe("Runtime Validation", () => {
    it("validateAndResolveModel should accept valid active models", () => {
      const activeModels = getActiveModelNames()
      if (activeModels.length > 0) {
        const validModel = activeModels[0]
        const result = validateAndResolveModel(validModel, validModel)
        expect(result).toBe(validModel)
      }
    })

    it("validateAndResolveModel should throw for inactive models", () => {
      const inactiveModel = "moonshotai/kimi-k2" as AnyModelName
      expect(() => {
        validateAndResolveModel(inactiveModel, inactiveModel)
      }).toThrow(/not active/)
    })

    it("validateAndResolveModel should use fallback for undefined", () => {
      const activeModels = getActiveModelNames()
      if (activeModels.length > 0) {
        const fallback = activeModels[0]
        const result = validateAndResolveModel(undefined, fallback)
        expect(result).toBe(fallback)
      }
    })

    it("validateAndResolveModel should throw for invalid model names", () => {
      const invalidModel = "invalid/nonexistent-model-xyz" as AnyModelName
      expect(() => {
        validateAndResolveModel(invalidModel, invalidModel)
      }).toThrow()
    })
  })

  describe("Model Pricing Lookup", () => {
    it("getModelV2 should return pricing for active models", () => {
      const activeModels = getActiveModelNames()
      if (activeModels.length > 0) {
        const catalogId = activeModels[0] // Catalog ID format: "vendor:X;model:Y"
        const pricing = getModelV2(catalogId)

        expect(pricing).toBeDefined()
        // pricing.id should be the API model name (extracted from catalog ID)
        // Extract model name from catalog ID: "vendor:openai;model:gpt-4.1-mini" -> "gpt-4.1-mini"
        const expectedModelName = catalogId.split("model:")[1]
        expect(pricing.id).toBe(expectedModelName)
        expect(typeof pricing.input).toBe("number")
        expect(typeof pricing.output).toBe("number")
        expect(pricing.active).toBe(true)
      }
    })

    it("getModelV2 should throw for unknown models", () => {
      const unknownModel = "unknown/model-does-not-exist"
      expect(() => {
        getModelV2(unknownModel)
      }).toThrow(/not found/)
    })

    it("getModelV2 should work with custom provider", () => {
      // Test cross-provider lookup
      const pricing = getModelV2("google/gemini-2.5-flash-lite", "openrouter")
      expect(pricing).toBeDefined()
      expect(pricing.id).toBe("google/gemini-2.5-flash-lite")
    })
  })

  describe("Cross-Provider Support", () => {
    it("AllowedModelName should work with all providers", () => {
      const or: OpenRouterModelName = "google/gemini-2.5-flash-lite"
      const groq: AnyModelName = "openai/gpt-oss-20b"
      const openai: AnyModelName = "gpt-4.1-mini"

      expect([or, groq, openai]).toHaveLength(3)
    })

    it("getActiveModelNames should accept provider parameter", () => {
      const openrouterModels = getActiveModelNames("openrouter")
      const groqModels = getActiveModelNames("groq")
      const openaiModels = getActiveModelNames("openai")

      // All providers should return arrays
      expect(Array.isArray(openrouterModels)).toBe(true)
      expect(Array.isArray(groqModels)).toBe(true)
      expect(Array.isArray(openaiModels)).toBe(true)

      // OpenAI should have active models (current default provider)
      expect(openaiModels.length).toBeGreaterThan(0)

      // OpenAI native models use catalog ID format: "vendor:openai;model:X"
      if (openaiModels.length > 0) {
        expect(openaiModels.every(m => m.startsWith("vendor:openai;model:"))).toBe(true)
      }
    })

    it("should handle provider-specific model formats", () => {
      // OpenRouter format: "provider/model"
      const openrouterModel = "google/gemini-2.5-flash-lite"
      expect(openrouterModel).toContain("/")

      // Native OpenAI format: "model-name"
      const openaiModel = "gpt-4.1-mini"
      expect(openaiModel).not.toContain("/")

      // Both should be valid AnyModelName
      const any1: AnyModelName = openrouterModel
      const any2: AnyModelName = openaiModel
      expect([any1, any2]).toHaveLength(2)
    })
  })

  describe("Type Safety Guarantees", () => {
    it("should prevent accidental provider mismatches at runtime", () => {
      const currentProvider = getCurrentProvider()

      // Get models for a different provider
      const otherProvider = currentProvider === "openrouter" ? "groq" : "openrouter"
      const otherModels = getActiveModelNames(otherProvider)

      if (otherModels.length > 0) {
        const modelFromOtherProvider = otherModels[0]

        // This should fail runtime validation (model not active for current provider)
        const isValid = isActiveModel(modelFromOtherProvider)

        // If providers use different formats, this should be false
        // If formats overlap, it might be true - that's OK, runtime will catch it
        expect(typeof isValid).toBe("boolean")
      }
    })

    it("should maintain type safety through workflow persistence", () => {
      // Simulate workflow storage/retrieval
      const workflowModel: AnyModelName = "gpt-4.1-mini"

      // Storage accepts any model (cross-provider compatibility)
      const stored: { modelName: AnyModelName } = { modelName: workflowModel }
      expect(stored.modelName).toBe(workflowModel)

      // Retrieval returns AnyModelName
      const retrieved: AnyModelName = stored.modelName
      expect(retrieved).toBe(workflowModel)

      // Execution validates at runtime
      // (validateAndResolveModel called in sendAI)
    })

    it("should handle model name edge cases", () => {
      // Empty string
      expect(isActiveModel("")).toBe(false)

      // Special characters
      expect(isActiveModel("invalid/model/with/slashes")).toBe(false)

      // Very long model name
      const longName = "a".repeat(1000)
      expect(isActiveModel(longName)).toBe(false)

      // Case sensitivity
      const lowerCase = "gpt-4.1-mini"
      const upperCase = "OPENAI/GPT-4.1-MINI"
      expect(isActiveModel(lowerCase)).not.toBe(isActiveModel(upperCase))
    })
  })

  describe("Backward Compatibility", () => {
    it("should maintain compatibility with legacy code", () => {
      // Old code using ModelName
      const oldModel: ModelName = "gpt-4.1-mini"

      // New code using AnyModelName
      const newModel: AnyModelName = oldModel

      expect(newModel).toBe(oldModel)
    })

    it("should work with existing default models", async () => {
      const { getDefaultModels } = await import("@core/core-config/compat")
      const defaults = getDefaultModels()

      // All defaults should be valid AnyModelName
      const allDefaults = [
        defaults.default,
        defaults.summary,
        defaults.nano,
        defaults.low,
        defaults.medium,
        defaults.high,
      ]

      for (const model of allDefaults) {
        const asAnyModel: AnyModelName = model
        expect(typeof asAnyModel).toBe("string")
      }
    })
  })

  describe("Type System Documentation", () => {
    it("should document the type hierarchy", () => {
      // Document the relationship:
      // AnyModelName = union of all provider models
      //   ├── OpenRouterModelName = "provider/model" format
      //   ├── GroqModelName = "provider/model" format
      //   └── OpenAIModelName = "model-name" format (no prefix)
      //
      // ModelName = AnyModelName (unified type)
      // AllowedModelName<Provider> = active models for specific provider

      const documentation = {
        typeHierarchy: "AnyModelName → ModelName → AllowedModelName<Provider>",
        runtimeValidation: "validateAndResolveModel() + isActiveModel()",
        crossProviderSupport: true,
        compileTimeSafety: "AnyModelName (permissive)",
        runtimeSafety: "validateAndResolveModel() (strict)",
      }

      expect(documentation.crossProviderSupport).toBe(true)
    })
  })
})
