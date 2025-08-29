// Description: Validates configuration and problem schema checks. Ensures
// informative errors for invalid numeric ranges, probabilities, tournament sizes,
// and missing problem functions.
import { describe, expect, it } from "vitest"
import {
  ConfigError,
  ProblemError,
  validateConfig,
  validateProblem,
} from "../src/lib/errors"
import type { GPProblem } from "../src/types"

describe("validateConfig", () => {
  it("accepts valid config", () => {
    expect(() => validateConfig({})).not.toThrow()
    expect(() => validateConfig({
      popSize: 50,
      generations: 100,
      elite: 2,
      cxProb: 0.5,
      mutProb: 0.1,
      immigration: 0.05,
      tournament: 3,
    })).not.toThrow()
  })

  it("rejects invalid popSize", () => {
    expect(() => validateConfig({ popSize: 1 }))
      .toThrow(ConfigError)
    expect(() => validateConfig({ popSize: 1.5 }))
      .toThrow("Population size must be an integer >= 2")
    expect(() => validateConfig({ popSize: -10 }))
      .toThrow(ConfigError)
  })

  it("rejects invalid generations", () => {
    expect(() => validateConfig({ generations: 0 }))
      .toThrow("Generations must be an integer >= 1")
    expect(() => validateConfig({ generations: 1.5 }))
      .toThrow(ConfigError)
  })

  it("rejects invalid elite", () => {
    expect(() => validateConfig({ elite: -1 }))
      .toThrow("Elite count must be a non-negative integer")
    expect(() => validateConfig({ elite: 2.5 }))
      .toThrow(ConfigError)
  })

  it("rejects invalid probabilities", () => {
    expect(() => validateConfig({ cxProb: -0.1 }))
      .toThrow("Crossover probability must be between 0 and 1")
    expect(() => validateConfig({ cxProb: 1.1 }))
      .toThrow(ConfigError)
    expect(() => validateConfig({ mutProb: -0.1 }))
      .toThrow("Mutation probability must be between 0 and 1")
    expect(() => validateConfig({ mutProb: 1.1 }))
      .toThrow(ConfigError)
    expect(() => validateConfig({ immigration: -0.1 }))
      .toThrow("Immigration rate must be between 0 and 1")
    expect(() => validateConfig({ immigration: 1.1 }))
      .toThrow(ConfigError)
  })

  it("rejects invalid tournament size", () => {
    expect(() => validateConfig({ tournament: 0 }))
      .toThrow("Tournament size must be an integer >= 1")
    expect(() => validateConfig({ tournament: 1.5 }))
      .toThrow(ConfigError)
  })
})

describe("validateProblem", () => {
  it("accepts valid problem", () => {
    const problem: GPProblem<number> = {
      createRandom: () => 0,
      fitness: () => 0,
      mutate: (g) => g,
      crossover: (a, b) => [a, b],
    }
    expect(() => validateProblem(problem)).not.toThrow()
  })

  it("rejects incomplete problems", () => {
    expect(() => validateProblem({} as any))
      .toThrow(ProblemError)
    expect(() => validateProblem({ fitness: () => 0 } as any))
      .toThrow("Problem must have a createRandom function")
    expect(() => validateProblem({
      createRandom: () => 0,
      fitness: () => 0,
      mutate: () => 0,
    } as any))
      .toThrow("Problem must have a crossover function")
  })
})
