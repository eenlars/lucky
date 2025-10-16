import { describe, expect, it } from "vitest"
import { getEffectiveMaxSteps } from "../utils"

describe("getEffectiveMaxSteps", () => {
  it("should use nodeMaxSteps when provided", () => {
    expect(getEffectiveMaxSteps(3, 10)).toBe(3)
    expect(getEffectiveMaxSteps(5, 10)).toBe(5)
  })

  it("should use globalDefault when nodeMaxSteps is undefined", () => {
    expect(getEffectiveMaxSteps(undefined, 7)).toBe(7)
    expect(getEffectiveMaxSteps(undefined, 5)).toBe(5)
  })

  it("should cap at 10 even if values are higher", () => {
    expect(getEffectiveMaxSteps(15, 5)).toBe(10) // node 15 > cap 10
    expect(getEffectiveMaxSteps(20, 5)).toBe(10) // node 20 > cap 10
    expect(getEffectiveMaxSteps(5, 15)).toBe(5) // node 5 < cap 10, node wins
    expect(getEffectiveMaxSteps(undefined, 15)).toBe(10) // global 15 > cap 10
  })

  it("should default to 10 when both are undefined", () => {
    expect(getEffectiveMaxSteps(undefined, undefined as any)).toBe(10)
  })

  it("should handle edge cases", () => {
    expect(getEffectiveMaxSteps(1, 10)).toBe(1)
    expect(getEffectiveMaxSteps(10, 10)).toBe(10)
    expect(getEffectiveMaxSteps(0, 10)).toBe(0) // Edge case: 0 is valid but will immediately terminate
  })

  it("should follow priority chain: nodeConfig > global > 10", () => {
    // nodeConfig takes precedence
    expect(getEffectiveMaxSteps(2, 8)).toBe(2)

    // global when node not set
    expect(getEffectiveMaxSteps(undefined, 8)).toBe(8)

    // hard cap applies to both
    expect(getEffectiveMaxSteps(12, 8)).toBe(10) // node 12 capped
    expect(getEffectiveMaxSteps(8, 12)).toBe(8) // node 8 wins (< cap)
  })
})
