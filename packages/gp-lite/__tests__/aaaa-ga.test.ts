import { describe, expect, it } from "vitest"
import { GPLite } from "../src/index"
import { makeAaaaProblem } from "./problems/aaaa"

describe("GA to reach 'aaaa' with shaped fitness", () => {
  // This test implements a tiny, zero-dependency GA that evolves a 4-letter genome
  // (a–z) to the string "aaaa". It uses a shaped fitness f = 2^k − 1 (k = count of
  // 'a' alleles), uniform crossover, and mutation that always changes the chosen locus.
  it("converges to aaaa well before brute force (26^L)", () => {
    const { problem, counters, constants, toString } = makeAaaaProblem(4)
    const { L, alphabetSize, targetString } = constants

    const gp = new GPLite(problem, {
      popSize: 64,
      generations: 200,
      elite: 2,
      cxProb: 0.9,
      mutProb: 0.25,
      immigration: 0.02,
      tournament: 3,
      stall: 50,
      targetFitness: 2 ** L - 1, // all L positions are 'a'
      timeLimitMs: 5000, // auto-stop safety net
      rng: GPLite.seed(40), // deterministic
    })

    const res = gp.run()

    // Validate solution quality
    expect(res.bestFitness).toBe(2 ** L - 1)
    expect(toString(res.best)).toBe(targetString)

    // Validate efficiency: far fewer than 26^L evaluations
    const bruteForce = alphabetSize ** L
    expect(counters.evalCount).toBeLessThan(bruteForce)
  })
})
