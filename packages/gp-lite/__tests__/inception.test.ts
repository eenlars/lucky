// Simple inception-style search: use GPLite to solve the 'aaaa' task
// under multiple parameter settings and pick a fast-converging config.
// This is a basic starting point (not a full multi-objective GA tuner),
// but demonstrates using the new time-limit auto stop to bound runtime.
import { describe, expect, it } from "vitest"
import { GPLite } from "../src/index"
import { makeAaaaProblem } from "./problems/aaaa"

type Candidate = {
  popSize: number
  cxProb: number
  mutProb: number
  tournament: number
  immigration: number
  stall: number
}

function lexicographicScore(a: [number, number], b: [number, number]) {
  // first element wins; break ties with second
  if (a[0] !== b[0]) return a[0] - b[0]
  return a[1] - b[1]
}

describe("Inception search (starter)", () => {
  it("finds a config that converges quickly within time limit", () => {
    const L = 4
    const { problem, constants } = makeAaaaProblem(L)
    const targetFitness = 2 ** L - 1

    // Small candidate pool to keep test quick/deterministic
    const candidates: Candidate[] = [
      { popSize: 32, cxProb: 0.9, mutProb: 0.2, tournament: 3, immigration: 0.02, stall: 30 },
      { popSize: 48, cxProb: 0.8, mutProb: 0.15, tournament: 2, immigration: 0.05, stall: 40 },
      { popSize: 64, cxProb: 0.9, mutProb: 0.25, tournament: 3, immigration: 0.02, stall: 50 },
      { popSize: 40, cxProb: 0.85, mutProb: 0.2, tournament: 4, immigration: 0.01, stall: 25 },
    ]

    let best: {
      cfg: Candidate
      generations: number
      elapsedMs: number
      reached: boolean
    } | null = null

    for (const cfg of candidates) {
      // Fresh problem instance to reset counters
      const { problem } = makeAaaaProblem(L)
      const gp = new GPLite(problem, {
        ...cfg,
        generations: 200,
        targetFitness,
        timeLimitMs: 250, // auto-stop if a candidate stalls
        rng: GPLite.seed(42),
      })
      const res = gp.run()

      const reached = res.bestFitness >= targetFitness
      const record = {
        cfg,
        generations: res.generations,
        elapsedMs: res.elapsedMs ?? 0,
        reached,
      }

      if (!best) best = record
      else {
        // Multi-objective (starter): minimize generations, then elapsedMs
        const cmp = lexicographicScore(
          [record.generations, record.elapsedMs],
          [best.generations, best.elapsedMs]
        )
        if (cmp < 0) best = record
      }
    }

    expect(best).not.toBeNull()
    // Should reach target quickly for at least one candidate
    expect(best!.reached).toBe(true)
    expect(best!.generations).toBeLessThanOrEqual(80)
    // Ensure the guard was available (sanity check; not asserting it triggered)
    expect(typeof best!.elapsedMs).toBe("number")
  })
})

