import { bunk, isNir } from "@utils/common/isNir"
import { describe, expect, it } from "vitest"

describe("isNir", () => {
  it("should return true for an empty object", () => {
    expect(isNir({})).toBe(true)
  })

  it("should return true for an empty string", () => {
    expect(isNir("{}")).toBe(true)
  })

  // Additional tests for completeness
  it("should return true for null and undefined", () => {
    expect(isNir(null)).toBe(true)
    expect(isNir(undefined)).toBe(true)
  })

  it("should return true for empty string", () => {
    expect(isNir("")).toBe(true)
  })

  it("should return true for empty array", () => {
    expect(isNir([])).toBe(true)
  })

  it("should return false for non-empty values", () => {
    expect(isNir("test")).toBe(false)
    expect(isNir(0)).toBe(false)
    expect(isNir([1])).toBe(false)
    expect(isNir({ key: "value" })).toBe(false)
  })
})

describe("bunk", () => {
  it("should return the default value for undefined values first", () => {
    expect(bunk(undefined, "default")).toBe("default")
    expect(bunk(null, "fallback")).toBe("fallback")
    expect(bunk("", "empty")).toBe("empty")
    expect(bunk("undefined", "string-undefined")).toBe("string-undefined")
    expect(bunk("null", "string-null")).toBe("string-null")
    expect(bunk("{}", "empty-object")).toBe("empty-object")
    expect(bunk([], "empty-array")).toBe("empty-array")
  })

  it("should return the actual value when not nir", () => {
    expect(bunk("test", "default")).toBe("test")
    expect(bunk(0, "default")).toBe(0)
    expect(bunk(false, "default")).toBe(false)
    expect(bunk([1, 2], "default")).toEqual([1, 2])
    expect(bunk({ key: "value" }, "default")).toEqual({ key: "value" })
  })

  it("should handle complex undefined scenarios", () => {
    expect(bunk([undefined, null, ""], "complex")).toBe("complex")
    expect(bunk([undefined, undefined], "nested-undefined")).toBe(
      "nested-undefined"
    )
    expect(bunk({}, "empty-obj")).toBe("empty-obj")
  })
})
