/**
 * tests for mutation types and weights
 */

import { describe, expect, it } from "vitest"
import { MUTATION_WEIGHTS } from "../mutations/mutation.types"

describe("Mutation Types", () => {
  describe("MUTATION_WEIGHTS", () => {
    it("should have weights that sum to 1.0", () => {
      const totalWeight = MUTATION_WEIGHTS.reduce(
        (sum, weight) => sum + weight.weight,
        0
      )

      // Allow for tiny floating point precision errors
      expect(totalWeight).toBeCloseTo(1.0, 10)
    })

    it("should include iterative mutation", () => {
      const iterativeWeight = MUTATION_WEIGHTS.find((w) => w.type === "iterative")

      expect(iterativeWeight).toBeDefined()
      expect(iterativeWeight?.weight).toBe(0.15)
      expect(iterativeWeight?.description).toBe(
        "Iterative improvement via unified approach"
      )
    })

    it("should have all weights be positive", () => {
      MUTATION_WEIGHTS.forEach((weight) => {
        expect(weight.weight).toBeGreaterThan(0)
      })
    })

    it("should have unique mutation types", () => {
      const types = MUTATION_WEIGHTS.map((w) => w.type)
      const uniqueTypes = new Set(types)

      expect(uniqueTypes.size).toBe(types.length)
    })

    it("should include all expected mutation types", () => {
      const expectedTypes = [
        "model",
        "prompt",
        "tool",
        "iterative",
        "structure",
        "addNode",
        "deleteNode",
      ]
      const actualTypes = MUTATION_WEIGHTS.map((w) => w.type)

      expectedTypes.forEach((expectedType) => {
        expect(actualTypes).toContain(expectedType)
      })
    })
  })
})
