import type { GPProblem } from "../../src/types"

export type Genome = number[]

export interface AaaaProblemBundle {
  problem: GPProblem<Genome>
  toString: (g: Genome) => string
  toChar: (n: number) => string
  constants: {
    L: number
    alphabetSize: number
    baseCharCode: number
    targetAllele: number
    targetString: string
  }
  counters: {
    get evalCount(): number
  }
}

/**
 * Build the reusable "reach 'aaaa'" problem for any genome length L.
 * Returns the GPProblem along with helpers and read-only counters.
 */
export function makeAaaaProblem(L = 4): AaaaProblemBundle {
  const alphabetSize = 26
  const baseCharCode = "a".charCodeAt(0)
  const targetAllele = 0
  const targetString = "a".repeat(L)

  const toChar = (n: number) => String.fromCharCode(baseCharCode + n)
  const toString = (g: Genome) => g.map(toChar).join("")

  let evalCount = 0

  const problem: GPProblem<Genome> = {
    createRandom: (rng) => Array.from({ length: L }, () => rng.int(alphabetSize)),
    fitness: (g) => {
      evalCount++
      let k = 0
      for (let i = 0; i < L; i++) if (g[i] === targetAllele) k++
      // shaped: 2^k - 1
      return 2 ** k - 1
    },
    mutate: (g, rng) => {
      const i = rng.int(L)
      const c = g.slice()
      // resample uniformly excluding current value (guarantee change)
      let v = c[i]
      while (v === c[i]) v = rng.int(alphabetSize)
      c[i] = v
      return c
    },
    crossover: (a, b, rng) => {
      const c1 = new Array<number>(L)
      const c2 = new Array<number>(L)
      for (let i = 0; i < L; i++) {
        c1[i] = rng.next() < 0.5 ? a[i] : b[i]
        c2[i] = rng.next() < 0.5 ? a[i] : b[i]
      }
      return [c1, c2]
    },
  }

  return {
    problem,
    toString,
    toChar,
    constants: { L, alphabetSize, baseCharCode, targetAllele, targetString },
    counters: {
      get evalCount() {
        return evalCount
      },
    },
  }
}

