// Description: Verifies selector customization: pluggable selectors are used,
// compares a random selector vs tournament, and implements a fitness-proportional
// (roulette) selector to ensure selection pressure behaves as intended.
import { describe, expect, it } from "vitest"
import { GPLite } from "../src/index"
import type { GPProblem, Selector } from "../src/types"
import { mulberry32 } from "../src/index"

describe("Custom selector", () => {
  it("uses custom selector from config", () => {
    let selectorCalled = false
    
    const customSelector: Selector<number> = () => {
      selectorCalled = true
      // Always select the best
      return 0
    }
    
    const problem: GPProblem<number> = {
      createRandom: (rng) => rng.int(100),
      fitness: (g) => g,
      mutate: (g) => g + 1,
      crossover: (a, b) => [(a + b) / 2, (a + b) / 2],
    }
    
    const gp = new GPLite(problem, {
      popSize: 10,
      generations: 3,
      selector: customSelector,
      rng: mulberry32(42),
    })
    
    gp.run()
    expect(selectorCalled).toBe(true)
  })

  it("random selector (opposite of tournament)", () => {
    // Random selector - ignores fitness
    const randomSelector: Selector<number> = (pop, rng) => {
      return rng.int(pop.length)
    }
    
    const problem: GPProblem<number> = {
      createRandom: () => 0,
      fitness: (g) => g,
      mutate: (g) => g + 1,
      crossover: (a, b) => [a, b],
    }
    
    const gpRandom = new GPLite(problem, {
      popSize: 20,
      generations: 10,
      selector: randomSelector,
      elite: 0,
      rng: mulberry32(42),
    })
    
    const gpTournament = new GPLite(problem, {
      popSize: 20,
      generations: 10,
      tournament: 5,
      elite: 0,
      rng: mulberry32(42),
    })
    
    const randomResult = gpRandom.run()
    const tournamentResult = gpTournament.run()
    
    // Tournament should perform better than random
    expect(tournamentResult.bestFitness).toBeGreaterThan(randomResult.bestFitness)
  })

  it("fitness proportional selection", () => {
    // Roulette wheel selection
    const fitnessProportional: Selector<number> = (pop, rng) => {
      const totalFitness = pop.reduce((sum, ind) => {
        // Handle negative fitness by shifting
        const f = Math.max(0, ind.f + 1000)
        return sum + f
      }, 0)
      
      if (totalFitness === 0) return rng.int(pop.length)
      
      const r = rng.next() * totalFitness
      let sum = 0
      for (let i = 0; i < pop.length; i++) {
        sum += Math.max(0, pop[i].f + 1000)
        if (sum >= r) return i
      }
      return pop.length - 1
    }
    
    const problem: GPProblem<number> = {
      createRandom: (rng) => rng.int(100),
      fitness: (g) => g * g, // Quadratic to test proportional selection
      mutate: (g, rng) => Math.max(0, g + rng.int(5) - 2),
      crossover: (a, b) => [(a + b) / 2, (a + b) / 2],
    }
    
    const gp = new GPLite(problem, {
      popSize: 50,
      generations: 20,
      selector: fitnessProportional,
      rng: mulberry32(42),
    })
    
    const result = gp.run()
    expect(result.bestFitness).toBeGreaterThan(1000)
  })
})
