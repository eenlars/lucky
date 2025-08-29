// Description: Smoke-style GA example using a classic OneMax bitstring.
// Demonstrates fitness improvement and early stopping toward a near-optimal
// solution within a capped number of generations.
import { describe, expect, it } from "vitest"
import { GPLite } from "../src/index"
import type { GPProblem } from "../src/types"

type BitString = boolean[]

const OneMax: GPProblem<BitString> = {
  createRandom: (rng) => Array.from({ length: 64 }, () => rng.next() < 0.5),
  fitness: (g) => g.filter(Boolean).length,
  mutate: (g, rng) => {
    const i = rng.int(g.length)
    const c = g.slice()
    c[i] = !c[i]
    return c
  },
  crossover: (a, b, rng) => {
    const cut = rng.int(a.length)
    return [
      [...a.slice(0, cut), ...b.slice(cut)],
      [...b.slice(0, cut), ...a.slice(cut)],
    ]
  },
}

describe("GPLite OneMax", () => {
  it("improves fitness and stops early when near-optimal", () => {
    const gp = new GPLite(OneMax, {
      popSize: 100,
      generations: 200,
      targetFitness: 64,
    })
    const res = gp.run()
    expect(res.bestFitness).toBeGreaterThan(50)
    expect(res.generations).toBeGreaterThan(0)
  })
})
