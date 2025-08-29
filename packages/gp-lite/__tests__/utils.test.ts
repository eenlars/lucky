// Description: Validates the mulberry32 RNG for determinism, seed variance,
// and output ranges, including the int(max) helper. Ensures the PRNG is
// predictable under the same seed and bounded as expected.
import { describe, expect, it } from "vitest"
import { mulberry32 } from "../src/index"

describe("mulberry32 RNG", () => {
  it("generates deterministic values with same seed", () => {
    const rng1 = mulberry32(12345)
    const rng2 = mulberry32(12345)
    
    expect(rng1.next()).toBe(rng2.next())
    expect(rng1.next()).toBe(rng2.next())
    expect(rng1.int(100)).toBe(rng2.int(100))
  })
  
  it("generates different values with different seeds", () => {
    const rng1 = mulberry32(12345)
    const rng2 = mulberry32(54321)
    
    expect(rng1.next()).not.toBe(rng2.next())
  })
  
  it("generates values in correct range", () => {
    const rng = mulberry32(42)
    
    for (let i = 0; i < 100; i++) {
      const val = rng.next()
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(1)
    }
  })
  
  it("int() generates values in correct range", () => {
    const rng = mulberry32(42)
    const max = 10
    
    for (let i = 0; i < 100; i++) {
      const val = rng.int(max)
      expect(val).toBeGreaterThanOrEqual(0)
      expect(val).toBeLessThan(max)
      expect(Number.isInteger(val)).toBe(true)
    }
  })
})
