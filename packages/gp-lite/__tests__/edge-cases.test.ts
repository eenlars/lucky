// Description: Exercises engine robustness for edge cases: NaN/Infinity or
// throwing fitness functions, repair hooks, invalid genomes that remain invalid,
// minimal population sizes, zero elite, immigration rate, and seeding.
import { describe, expect, it } from "vitest"
import { GPLite } from "../src/index"
import type { GPProblem } from "../src/types"
import { mulberry32 } from "../src/index"

describe("GPLite edge cases", () => {
  it("handles fitness functions that return NaN", () => {
    const problem: GPProblem<number> = {
      createRandom: () => 0,
      fitness: () => NaN,
      mutate: (g) => g,
      crossover: (a, b) => [a, b],
    }
    
    const gp = new GPLite(problem, {
      popSize: 5,
      generations: 2,
      rng: mulberry32(42),
    })
    
    const result = gp.run()
    expect(result.bestFitness).toBe(-Infinity)
  })

  it("handles fitness functions that return Infinity", () => {
    const problem: GPProblem<number> = {
      createRandom: () => 0,
      fitness: () => Infinity,
      mutate: (g) => g,
      crossover: (a, b) => [a, b],
    }
    
    const gp = new GPLite(problem, {
      popSize: 5,
      generations: 2,
      rng: mulberry32(42),
    })
    
    const result = gp.run()
    expect(result.bestFitness).toBe(-Infinity)
  })

  it("handles fitness functions that throw errors", () => {
    const problem: GPProblem<number> = {
      createRandom: () => 0,
      fitness: () => { throw new Error("boom") },
      mutate: (g) => g,
      crossover: (a, b) => [a, b],
    }
    
    const gp = new GPLite(problem, {
      popSize: 5,
      generations: 2,
      rng: mulberry32(42),
    })
    
    expect(() => gp.run()).not.toThrow()
    const result = gp.run()
    expect(result.bestFitness).toBe(-Infinity)
  })

  it("uses repair function when genome is invalid", () => {
    let repairCalled = false
    const problem: GPProblem<number> = {
      createRandom: () => -1, // invalid
      fitness: (g) => g,
      mutate: (g) => g - 1, // makes invalid
      crossover: (a, b) => [a, b],
      isValid: (g) => g >= 0,
      repair: (g) => {
        repairCalled = true
        return Math.abs(g)
      },
    }
    
    const gp = new GPLite(problem, {
      popSize: 5,
      generations: 2,
      rng: mulberry32(42),
    })
    
    gp.run()
    expect(repairCalled).toBe(true)
  })

  it("assigns -Infinity when repair doesn't fix invalid genome", () => {
    const problem: GPProblem<number> = {
      createRandom: () => -1,
      fitness: (g) => g,
      mutate: (g) => g,
      crossover: (a, b) => [a, b],
      isValid: (g) => g >= 0,
      repair: () => -2, // still invalid
    }
    
    const gp = new GPLite(problem, {
      popSize: 5,
      generations: 2,
      rng: mulberry32(42),
    })
    
    const result = gp.run()
    expect(result.bestFitness).toBe(-Infinity)
  })

  it("works with minimal population (size 2)", () => {
    const problem: GPProblem<number> = {
      createRandom: (rng) => rng.int(100),
      fitness: (g) => g,
      mutate: (g) => g + 1,
      crossover: (a, b) => [a, b],
    }
    
    const gp = new GPLite(problem, {
      popSize: 2,
      generations: 5,
      elite: 1,
      rng: mulberry32(42),
    })
    
    const result = gp.run()
    expect(result.best).toBeDefined()
    expect(result.generations).toBeGreaterThan(0)
  })

  it("handles zero elite correctly", () => {
    const problem: GPProblem<number> = {
      createRandom: (rng) => rng.int(100),
      fitness: (g) => g,
      mutate: (g) => g + 1,
      crossover: (a, b) => [a, b],
    }
    
    const gp = new GPLite(problem, {
      popSize: 10,
      generations: 5,
      elite: 0,
      rng: mulberry32(42),
    })
    
    const result = gp.run()
    expect(result.best).toBeDefined()
  })

  it("respects immigration rate", () => {
    let immigrantCount = 0
    const problem: GPProblem<number> = {
      createRandom: () => {
        immigrantCount++
        return 0
      },
      fitness: (g) => g,
      mutate: (g) => g,
      crossover: (a, b) => [a, b],
    }
    
    const gp = new GPLite(problem, {
      popSize: 10,
      generations: 3,
      immigration: 0.2, // 20% = 2 immigrants per gen
      rng: mulberry32(42),
    })
    
    immigrantCount = 0 // reset after init
    gp.run()
    // 2 immigrants per gen * 3 gens = 6
    expect(immigrantCount).toBeGreaterThanOrEqual(6)
  })

  it("uses GPLite.seed() static method", () => {
    const problem: GPProblem<number> = {
      createRandom: (rng) => rng.int(100),
      fitness: (g) => g,
      mutate: (g) => g,
      crossover: (a, b) => [a, b],
    }
    
    const rng = GPLite.seed(12345)
    const gp = new GPLite(problem, { popSize: 10, generations: 2, rng })
    
    const result1 = gp.run()
    
    const rng2 = GPLite.seed(12345)
    const gp2 = new GPLite(problem, { popSize: 10, generations: 2, rng: rng2 })
    const result2 = gp2.run()
    
    expect(result1.bestFitness).toBe(result2.bestFitness)
  })
})
