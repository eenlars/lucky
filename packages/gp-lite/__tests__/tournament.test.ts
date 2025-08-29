// Description: Checks tournament selection selects valid indices and prefers
// higher-fitness individuals under larger tournament sizes, establishing the
// intended selection pressure behavior.
import { describe, expect, it } from "vitest"
import { tournament } from "../src/index"
import { mulberry32 } from "../src/index"

describe("tournament selection", () => {
  it("selects from population", () => {
    const pop = [
      { g: "a", f: 10 },
      { g: "b", f: 20 },
      { g: "c", f: 30 },
      { g: "d", f: 40 },
    ]
    const rng = mulberry32(42)
    const selector = tournament(3)
    
    const selected = selector(pop, rng)
    expect(selected).toBeGreaterThanOrEqual(0)
    expect(selected).toBeLessThan(pop.length)
  })
  
  it("prefers higher fitness", () => {
    const pop = [
      { g: "low", f: 1 },
      { g: "high", f: 100 },
    ]
    const rng = mulberry32(42)
    const selector = tournament(10) // large tournament for deterministic selection
    
    let highWins = 0
    for (let i = 0; i < 100; i++) {
      const selected = selector(pop, rng)
      if (selected === 1) highWins++
    }
    
    expect(highWins).toBeGreaterThan(70) // should heavily favor high fitness
  })
})
