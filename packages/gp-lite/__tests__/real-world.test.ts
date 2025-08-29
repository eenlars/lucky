// Description: Integration-style scenarios: evolves a symbolic regression to fit
// sample data and solves a small TSP using permutation genomes with an OX-like
// crossover. Ensures GPLite handles more realistic problem structures.
import { describe, expect, it } from "vitest"
import { GPLite, mulberry32 } from "../src/index"
import type { GPProblem } from "../src/types"

// Real-world test: Symbolic Regression
describe("Real-world problems", () => {
  // Find f(x) = x² + 2x + 1
  type Expr =
    | { type: "const"; value: number }
    | { type: "var" }
    | { type: "add"; left: Expr; right: Expr }
    | { type: "mul"; left: Expr; right: Expr }

  function evalExpr(expr: Expr, x: number): number {
    switch (expr.type) {
      case "const":
        return expr.value
      case "var":
        return x
      case "add":
        return evalExpr(expr.left, x) + evalExpr(expr.right, x)
      case "mul":
        return evalExpr(expr.left, x) * evalExpr(expr.right, x)
    }
  }

  function randomExpr(rng: any, depth = 3): Expr {
    if (depth <= 1 || rng.next() < 0.3) {
      return rng.next() < 0.5
        ? { type: "var" }
        : { type: "const", value: rng.int(10) - 5 }
    }

    const op = rng.next() < 0.5 ? "add" : "mul"
    return {
      type: op,
      left: randomExpr(rng, depth - 1),
      right: randomExpr(rng, depth - 1),
    } as Expr
  }

  it("evolves symbolic regression", () => {
    const testCases = [
      { x: -2, y: 1 }, // (-2)² + 2(-2) + 1 = 1
      { x: -1, y: 0 }, // (-1)² + 2(-1) + 1 = 0
      { x: 0, y: 1 }, // 0² + 2(0) + 1 = 1
      { x: 1, y: 4 }, // 1² + 2(1) + 1 = 4
      { x: 2, y: 9 }, // 2² + 2(2) + 1 = 9
    ]

    const problem: GPProblem<Expr> = {
      createRandom: (rng) => randomExpr(rng, 4),
      fitness: (expr) => {
        let error = 0
        for (const { x, y } of testCases) {
          const pred = evalExpr(expr, x)
          error += Math.abs(pred - y)
        }
        return -error // negative because higher is better
      },
      mutate: (expr, rng) => {
        // Simple subtree mutation
        if (rng.next() < 0.3) return randomExpr(rng, 3)

        if ("left" in expr && rng.next() < 0.5) {
          return { ...expr, left: randomExpr(rng, 2) }
        }
        if ("right" in expr) {
          return { ...expr, right: randomExpr(rng, 2) }
        }
        return randomExpr(rng, 2)
      },
      crossover: (a, b, rng) => {
        // Swap subtrees
        if ("left" in a && "left" in b && rng.next() < 0.5) {
          return [
            { ...a, left: b.left },
            { ...b, left: a.left },
          ]
        }
        return [a, b]
      },
    }

    const gp = new GPLite(problem, {
      popSize: 100,
      generations: 50,
      targetFitness: -0.1, // Close to perfect
      rng: mulberry32(42),
    })

    const result = gp.run()
    expect(result.bestFitness).toBeGreaterThanOrEqual(-5)

    // Test the evolved solution
    const solution = result.best
    const solutionError = Math.abs(evalExpr(solution, 3) - 16) // f(3) = 16
    expect(solutionError).toBeLessThan(5)
  })

  // Traveling Salesman Problem (small instance)
  it("solves small TSP", () => {
    const cities = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ] // Square with optimal tour length = 4

    type Tour = number[]

    function tourDistance(tour: Tour): number {
      let dist = 0
      for (let i = 0; i < tour.length; i++) {
        const from = cities[tour[i]]
        const to = cities[tour[(i + 1) % tour.length]]
        dist += Math.sqrt((from[0] - to[0]) ** 2 + (from[1] - to[1]) ** 2)
      }
      return dist
    }

    const problem: GPProblem<Tour> = {
      createRandom: (rng) => {
        const tour = [0, 1, 2, 3]
        // Fisher-Yates shuffle
        for (let i = tour.length - 1; i > 0; i--) {
          const j = rng.int(i + 1)
          ;[tour[i], tour[j]] = [tour[j], tour[i]]
        }
        return tour
      },
      fitness: (tour) => -tourDistance(tour), // negative for minimization
      mutate: (tour, rng) => {
        const copy = [...tour]
        const i = rng.int(tour.length)
        const j = rng.int(tour.length)
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
        return copy
      },
      crossover: (a, b, rng) => {
        // Order crossover (OX)
        const size = a.length
        const start = rng.int(size)
        const end = rng.int(size)
        const [s, e] = start < end ? [start, end] : [end, start]

        const child1 = new Array(size).fill(-1)
        const child2 = new Array(size).fill(-1)

        // Copy segments
        for (let i = s; i <= e; i++) {
          child1[i] = a[i]
          child2[i] = b[i]
        }

        // Fill remaining
        let pos1 = (e + 1) % size
        let pos2 = (e + 1) % size
        for (let i = 0; i < size; i++) {
          const idx = (e + 1 + i) % size
          if (!child1.includes(b[idx])) {
            child1[pos1] = b[idx]
            pos1 = (pos1 + 1) % size
          }
          if (!child2.includes(a[idx])) {
            child2[pos2] = a[idx]
            pos2 = (pos2 + 1) % size
          }
        }

        return [child1, child2]
      },
    }

    const gp = new GPLite(problem, {
      popSize: 50,
      generations: 100,
      targetFitness: -4.1, // Optimal is -4
      rng: mulberry32(42),
    })

    const result = gp.run()
    expect(result.bestFitness).toBeGreaterThan(-5)
    expect(result.bestFitness).toBeLessThanOrEqual(-4)
  })
})
