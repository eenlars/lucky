import { describe, expect, it } from "vitest"
import { GPLite } from "../src/index"
import type { GPProblem } from "../src/types"
import { mulberry32 } from "../src/index"

describe("Budgets", () => {
  const problem: GPProblem<number> = {
    createRandom: (rng) => rng.int(100),
    fitness: (g) => g,
    mutate: (g, rng) => rng.int(100),
    crossover: (a, b) => [a, b],
  }

  it("stops immediately when maxEvaluations is exhausted at init", () => {
    const gp = new GPLite(problem, {
      popSize: 10,
      generations: 100,
      maxEvaluations: 5, // less than popSize, so init consumes the budget
      rng: mulberry32(1),
    })

    const res = gp.run()
    expect(res.stopReason).toBe("evaluations")
    expect(res.generations).toBe(0)
    expect(res.history.length).toBe(1) // best after init
  })

  it("stops quickly when maxWallMs is zero", () => {
    const gp = new GPLite(problem, {
      popSize: 10,
      generations: 100,
      maxWallMs: 0, // alias of time limit, should trigger immediately after first gen stats
      rng: mulberry32(2),
    })

    const res = gp.run()
    expect(res.stopReason).toBe("time")
    expect(res.generations).toBeGreaterThanOrEqual(0)
  })
})
