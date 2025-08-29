// Description: Covers core GPLite engine behavior: default and custom config,
// basic evolutionary improvement, generation callback, early stopping, and
// resilience to invalid genomes with stall detection.
import { describe, expect, it, vi } from "vitest"
import { GPLite } from "../src/index"
import type { GPProblem } from "../src/types"
import { mulberry32 } from "../src/index"

type SimpleGenome = number[]

const SimpleProblem: GPProblem<SimpleGenome> = {
  createRandom: (rng) => Array.from({ length: 5 }, () => rng.int(100)),
  fitness: (g) => g.reduce((a, b) => a + b, 0),
  mutate: (g, rng) => {
    const idx = rng.int(g.length)
    const copy = [...g]
    copy[idx] = rng.int(100)
    return copy
  },
  crossover: (a, b, rng) => {
    const cut = rng.int(a.length)
    return [
      [...a.slice(0, cut), ...b.slice(cut)],
      [...b.slice(0, cut), ...a.slice(cut)],
    ]
  },
}

describe("GPLite", () => {
  it("initializes with default config", () => {
    const gp = new GPLite(SimpleProblem)
    expect(gp.cfg.popSize).toBe(100)
    expect(gp.cfg.generations).toBe(1000)
    expect(gp.cfg.elite).toBe(2)
    expect(gp.cfg.cxProb).toBe(0.8)
    expect(gp.cfg.mutProb).toBe(0.1)
  })

  it("accepts custom config", () => {
    const gp = new GPLite(SimpleProblem, {
      popSize: 50,
      generations: 100,
      elite: 5,
    })
    expect(gp.cfg.popSize).toBe(50)
    expect(gp.cfg.generations).toBe(100)
    expect(gp.cfg.elite).toBe(5)
  })

  it("runs evolution and improves fitness", () => {
    const gp = new GPLite(SimpleProblem, {
      popSize: 20,
      generations: 50,
      rng: mulberry32(42),
    })

    const result = gp.run()
    expect(result.generations).toBeGreaterThan(0)
    expect(result.generations).toBeLessThanOrEqual(50)
    expect(result.bestFitness).toBeGreaterThan(0)
    expect(result.best).toHaveLength(5)
    expect(result.history).toHaveLength(result.generations)
  })

  it("calls onGen callback", () => {
    const onGen = vi.fn()
    const gp = new GPLite(SimpleProblem, {
      popSize: 10,
      generations: 5,
      rng: mulberry32(42),
    })

    gp.run(onGen)
    expect(onGen).toHaveBeenCalled()
    expect(onGen.mock.calls[0][0]).toHaveProperty("gen")
    expect(onGen.mock.calls[0][0]).toHaveProperty("best")
    expect(onGen.mock.calls[0][0]).toHaveProperty("mean")
  })

  it("stops early when target fitness is reached", () => {
    const gp = new GPLite(SimpleProblem, {
      popSize: 20,
      generations: 1000,
      targetFitness: 250, // achievable target
      rng: mulberry32(42),
    })

    const result = gp.run()
    expect(result.generations).toBeLessThan(1000)
    expect(result.bestFitness).toBeGreaterThanOrEqual(250)
  })

  it("handles invalid genomes safely", () => {
    const ProblemWithValidation: GPProblem<SimpleGenome> = {
      ...SimpleProblem,
      isValid: (g) => g.every((x) => x >= 0 && x <= 100),
      fitness: (g) => {
        if (g.some((x) => x > 50)) return NaN // invalid fitness
        return g.reduce((a, b) => a + b, 0)
      },
    }

    const gp = new GPLite(ProblemWithValidation, {
      popSize: 10,
      generations: 10,
      rng: mulberry32(42),
    })

    expect(() => gp.run()).not.toThrow()
  })

  it("handles stall detection", () => {
    // problem where fitness plateaus quickly
    const PlateauProblem: GPProblem<SimpleGenome> = {
      ...SimpleProblem,
      fitness: (g) =>
        Math.min(
          100,
          g.reduce((a, b) => a + b, 0)
        ), // caps at 100
    }

    const gp = new GPLite(PlateauProblem, {
      popSize: 50,
      generations: 1000,
      stall: 10, // stop after 10 generations of no improvement
      rng: mulberry32(42),
    })

    const result = gp.run()
    expect(result.generations).toBeLessThan(1000)
  })
})
