import { describe, it, expect, beforeEach } from "vitest"
import {
  setupCoreTest,
  mockRuntimeConstantsForGP,
  createMockEvolutionSettings,
  createMockGenome,
  createMockWorkflowScore,
} from "@core/utils/__tests__/setup/coreMocks"

import { Select } from "@core/improvement/gp/Select"

describe("Select - Basic Functionality", () => {
  // TODO: this file duplicates tests from Select.test.ts without clear differentiation
  // consider consolidating or clearly documenting the purpose of basic vs full tests
  beforeEach(() => {
    setupCoreTest()
    mockRuntimeConstantsForGP()
  })

  it("should have working selectRandomParents method", async () => {
    // Test that the Select class has the expected methods
    expect(Select).toBeDefined()
    expect(typeof Select.selectRandomParents).toBe("function")
    expect(typeof Select.selectParents).toBe("function")
    expect(typeof Select.selectSurvivors).toBe("function")
    expect(typeof Select.tournamentSelection).toBe("function")
  })

  it("should select valid parents from population", async () => {
    const validGenome = await createMockGenome(
      0,
      [],
      createMockWorkflowScore(0.8)
    )
    const invalidGenome = await createMockGenome(
      0,
      [],
      createMockWorkflowScore(0)
    )

    validGenome.getFitnessScore.mockReturnValue(0.8)
    invalidGenome.getFitnessScore.mockReturnValue(0)

    const mockPopulation = {
      getGenomes: () => [validGenome, invalidGenome],
    }

    const result = Select.selectRandomParents(mockPopulation as any, 1)

    expect(Array.isArray(result)).toBe(true)
    // TODO: weak assertion - test could pass if result is empty or null
    // should assert expectations directly without conditional logic
    if (result && result.length > 0) {
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(validGenome)
    }
  })

  it("should handle tournament selection", async () => {
    const genome1 = await createMockGenome(0, [], createMockWorkflowScore(0.9))
    const genome2 = await createMockGenome(0, [], createMockWorkflowScore(0.3))

    genome1.getFitnessScore.mockReturnValue(0.9)
    genome2.getFitnessScore.mockReturnValue(0.3)

    const winner = await Select.tournamentSelection([genome1, genome2], 2)

    // TODO: weak assertion - only checks if winner exists, not selection logic
    // should mock Math.random for deterministic test of tournament selection
    // In a tournament, either genome could win (due to randomness), but winner should be defined
    if (winner) {
      expect([genome1, genome2]).toContain(winner)
    }
  })

  it("should return undefined for tournament with empty population", async () => {
    const winner = await Select.tournamentSelection([], 2)
    expect(winner).toBeUndefined()
  })
})
