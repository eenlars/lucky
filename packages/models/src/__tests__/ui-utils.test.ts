import { describe, expect, it } from "vitest"
import { isUIVisibleModel } from "../ui-utils"

describe("UI Utils", () => {
  describe("isUIVisibleModel", () => {
    it("production hides models with uiHiddenInProd", () => {
      expect(isUIVisibleModel({ uiHiddenInProd: true }, "production")).toBe(false)
      expect(isUIVisibleModel({ uiHiddenInProd: false }, "production")).toBe(true)
    })

    it("production hides disabled models", () => {
      expect(isUIVisibleModel({ disabled: true }, "production")).toBe(false)
      expect(isUIVisibleModel({ disabled: false }, "production")).toBe(true)
    })

    it("production hides models with either flag set", () => {
      expect(isUIVisibleModel({ uiHiddenInProd: true, disabled: false }, "production")).toBe(false)
      expect(isUIVisibleModel({ uiHiddenInProd: false, disabled: true }, "production")).toBe(false)
      expect(isUIVisibleModel({ uiHiddenInProd: true, disabled: true }, "production")).toBe(false)
    })

    it("production shows models without flags", () => {
      expect(isUIVisibleModel({}, "production")).toBe(true)
      expect(isUIVisibleModel({ uiHiddenInProd: false, disabled: false }, "production")).toBe(true)
    })

    it("non-production shows all models regardless of flags", () => {
      const testCases = [{ uiHiddenInProd: true }, { disabled: true }, { uiHiddenInProd: true, disabled: true }, {}]

      for (const flags of testCases) {
        expect(isUIVisibleModel(flags, "development")).toBe(true)
        expect(isUIVisibleModel(flags, "staging")).toBe(true)
        expect(isUIVisibleModel(flags, "test")).toBe(true)
      }
    })

    it("treats undefined and non-production environments as permissive", () => {
      expect(isUIVisibleModel({ uiHiddenInProd: true }, undefined)).toBe(true)
      expect(isUIVisibleModel({ disabled: true }, undefined)).toBe(true)
      expect(isUIVisibleModel({}, undefined)).toBe(true)
    })

    it("handles edge case environment strings", () => {
      expect(isUIVisibleModel({ uiHiddenInProd: true }, "")).toBe(true)
      expect(isUIVisibleModel({ uiHiddenInProd: true }, "PRODUCTION")).toBe(true)
      expect(isUIVisibleModel({ uiHiddenInProd: true }, "prod")).toBe(true)
    })
  })
})
