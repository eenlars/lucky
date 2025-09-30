import {
  createMockEvolutionSettings,
  createMockGenome,
  createMockWorkflowScore,
  mockRuntimeConstantsForGP,
  setupCoreTest,
} from "@core/utils/__tests__/setup/coreMocks"
import { beforeEach, describe, expect, it, vi } from "vitest"

let Select: any

describe("Select", () => {
  beforeEach(() => {
    setupCoreTest()
    mockRuntimeConstantsForGP()
    vi.resetModules()
    vi.doUnmock("@core/improvement/gp/Select")
  })

  describe("selectRandomParents", () => {
    it("should select parents with fitness > 0", async () => {
      const validGenome = await createMockGenome(0, [], createMockWorkflowScore(0.8))
      const invalidGenome = await createMockGenome(0, [], createMockWorkflowScore(0))

      validGenome.getFitnessScore.mockReturnValue(0.8)
      invalidGenome.getFitnessScore.mockReturnValue(0)

      const mockPopulation = {
        getGenomes: vi.fn().mockReturnValue([validGenome, invalidGenome]),
      }

      const mod = await import("@core/improvement/gp/Select")
      Select = mod.Select
      const result = Select.selectRandomParents(mockPopulation as any, 1)

      expect(result).toHaveLength(1)
      expect(result[0]).toBe(validGenome)
      expect(result[0].getFitnessScore()).toBeGreaterThan(0)
    })

    it("should throw when requesting more parents than available", async () => {
      const genome = await createMockGenome(0, [], createMockWorkflowScore(0.8))
      genome.getFitnessScore.mockReturnValue(0.8)

      const mockPopulation = {
        getGenomes: vi.fn().mockReturnValue([genome]),
      }

      expect(() => {
        Select.selectRandomParents(mockPopulation as any, 2)
      }).toThrow("Cannot select 2 parents from 1 valid genomes")
    })

    it("should throw when no valid genomes exist", async () => {
      const mockPopulation = {
        getGenomes: vi.fn().mockReturnValue([]),
      }

      expect(() => {
        Select.selectRandomParents(mockPopulation as any, 1)
      }).toThrow("No valid genomes in population to select from")
    })
  })

  describe("selectParents", () => {
    it("should return dummy genome in verbose mode", async () => {
      // TODO: complex CONFIG mocking could be extracted to helper function
      // this pattern is repeated multiple times across tests
      // Mock CONFIG to enable verbose mode
      const { CONFIG } = await import("@core/core-config/compat")
      const originalVerbose = CONFIG.evolution.GP.verbose
      Object.defineProperty(CONFIG.evolution.GP, "verbose", {
        value: true,
        configurable: true,
      })

      const mockPopulation = {
        getGenomes: vi.fn().mockReturnValue([]),
      }

      const config = createMockEvolutionSettings({ populationSize: 4 })

      const mod = await import("@core/improvement/gp/Select")
      Select = mod.Select
      const result = await Select.selectParents({
        population: mockPopulation as any,
        config,
      })

      expect(result).toHaveLength(1)
      expect(result[0]).toBeDefined()

      // Restore original value
      Object.defineProperty(CONFIG.evolution.GP, "verbose", {
        value: originalVerbose,
        configurable: true,
      })
    })

    it("should perform elite + tournament selection in non-verbose mode", async () => {
      // Ensure verbose mode is off
      const { CONFIG } = await import("@core/core-config/compat")
      Object.defineProperty(CONFIG.evolution.GP, "verbose", {
        value: false,
        configurable: true,
      })

      // Create genomes with different fitness scores
      const bestGenome = await createMockGenome(0, [], createMockWorkflowScore(0.9))
      const goodGenome = await createMockGenome(0, [], createMockWorkflowScore(0.7))
      const okGenome = await createMockGenome(0, [], createMockWorkflowScore(0.5))

      // Set up proper fitness and evaluation status
      bestGenome.getFitnessScore.mockReturnValue(0.9)
      goodGenome.getFitnessScore.mockReturnValue(0.7)
      okGenome.getFitnessScore.mockReturnValue(0.5)

      bestGenome.isEvaluated = true
      goodGenome.isEvaluated = true
      okGenome.isEvaluated = true

      const mockPopulation = {
        getGenomes: vi.fn().mockReturnValue([bestGenome, goodGenome, okGenome]),
      }

      const config = createMockEvolutionSettings({
        populationSize: 4,
        eliteSize: 1,
        tournamentSize: 2,
      })

      const mod = await import("@core/improvement/gp/Select")
      Select = mod.Select
      const result = await Select.selectParents({
        population: mockPopulation as any,
        config,
      })

      expect(result.length).toBeGreaterThan(0)
      // TODO: comment says "populationSize / 2" which would be 2 exactly
      // but test uses toBeLessThanOrEqual(2) - should clarify or fix
      expect(result.length).toBeLessThanOrEqual(2) // populationSize / 2
      // Should include the elite (best genome)
      expect(result).toContain(bestGenome)
    })

    it("should throw when no evaluated genomes exist", async () => {
      const { CONFIG } = await import("@core/core-config/compat")
      Object.defineProperty(CONFIG.evolution.GP, "verbose", {
        value: false,
        configurable: true,
      })

      const unevaluatedGenome = await createMockGenome(0, [], createMockWorkflowScore(0.8))
      unevaluatedGenome.isEvaluated = false

      const mockPopulation = {
        getGenomes: vi.fn().mockReturnValue([unevaluatedGenome]),
      }

      const config = createMockEvolutionSettings({ populationSize: 4 })

      const mod = await import("@core/improvement/gp/Select")
      Select = mod.Select
      await expect(
        Select.selectParents({
          population: mockPopulation as any,
          config,
        })
      ).rejects.toThrow("No valid genomes with fitness scores found in population")
    })
  })

  describe("tournamentSelection", () => {
    it("should select winner from tournament", async () => {
      const highFitnessGenome = await createMockGenome(0, [], createMockWorkflowScore(0.9))
      const lowFitnessGenome = await createMockGenome(0, [], createMockWorkflowScore(0.3))

      highFitnessGenome.getFitnessScore.mockReturnValue(0.9)
      lowFitnessGenome.getFitnessScore.mockReturnValue(0.3)

      const population = [highFitnessGenome, lowFitnessGenome]

      const mod = await import("@core/improvement/gp/Select")
      Select = mod.Select
      const winner = await Select.tournamentSelection(population, 2)

      // TODO: test allows either genome to win, making it non-deterministic
      // should mock Math.random for deterministic test of selection bias
      expect(winner).toBeDefined()
      expect([highFitnessGenome, lowFitnessGenome]).toContain(winner)
    })

    it("should handle single genome tournament", async () => {
      const genome = await createMockGenome(0, [], createMockWorkflowScore(0.8))
      genome.getFitnessScore.mockReturnValue(0.8)

      const mod = await import("@core/improvement/gp/Select")
      Select = mod.Select
      const winner = await Select.tournamentSelection([genome], 1)

      expect(winner).toBe(genome)
    })

    it("should return undefined for empty population", async () => {
      const winner = await Select.tournamentSelection([], 2)
      expect(winner).toBeUndefined()
    })
  })

  describe("selectSurvivors", () => {
    it("should return dummy genomes in verbose mode", async () => {
      // Mock CONFIG to enable verbose mode
      const { CONFIG } = await import("@core/core-config/compat")
      const originalVerbose = CONFIG.evolution.GP.verbose
      Object.defineProperty(CONFIG.evolution.GP, "verbose", {
        value: true,
        configurable: true,
      })

      const mockParent = await createMockGenome(0, [], createMockWorkflowScore(0.7))
      const mockOffspring = await createMockGenome(1, [], createMockWorkflowScore(0.6))
      const config = createMockEvolutionSettings({ populationSize: 2 })

      const mod = await import("@core/improvement/gp/Select")
      Select = mod.Select
      const result = await Select.selectSurvivors({
        parents: [mockParent],
        offspring: [mockOffspring],
        config,
      })

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)

      // Restore original value
      Object.defineProperty(CONFIG.evolution.GP, "verbose", {
        value: originalVerbose,
        configurable: true,
      })
    })

    it("should combine and sort parents and offspring by fitness", async () => {
      const { CONFIG } = await import("@core/core-config/compat")
      Object.defineProperty(CONFIG.evolution.GP, "verbose", {
        value: false,
        configurable: true,
      })

      const parent1 = await createMockGenome(0, [], createMockWorkflowScore(0.8))
      const parent2 = await createMockGenome(0, [], createMockWorkflowScore(0.7))
      const offspring1 = await createMockGenome(1, [], createMockWorkflowScore(0.9))
      const offspring2 = await createMockGenome(1, [], createMockWorkflowScore(0.6))

      parent1.getFitnessScore.mockReturnValue(0.8)
      parent1.isEvaluated = true
      parent2.getFitnessScore.mockReturnValue(0.7)
      parent2.isEvaluated = true
      offspring1.getFitnessScore.mockReturnValue(0.9)
      offspring1.isEvaluated = true
      offspring2.getFitnessScore.mockReturnValue(0.6)
      offspring2.isEvaluated = true

      const config = createMockEvolutionSettings({ populationSize: 3 })

      const mod = await import("@core/improvement/gp/Select")
      Select = mod.Select
      const result = await Select.selectSurvivors({
        parents: [parent1, parent2],
        offspring: [offspring1, offspring2],
        config,
      })

      expect(result).toHaveLength(3)
      // Should select top 3 by fitness: offspring1 (0.9), parent1 (0.8), parent2 (0.7)
      expect(result[0]).toBe(offspring1)
      expect(result[1]).toBe(parent1)
      expect(result[2]).toBe(parent2)
    })

    it("should handle empty parents and offspring", async () => {
      const { CONFIG } = await import("@core/core-config/compat")
      Object.defineProperty(vi.mocked(CONFIG).evolution.GP, "verbose", {
        value: false,
        writable: true,
      })

      const config = createMockEvolutionSettings({ populationSize: 0 })

      const mod = await import("@core/improvement/gp/Select")
      Select = mod.Select
      const result = await Select.selectSurvivors({
        parents: [],
        offspring: [],
        config,
      })

      expect(result).toHaveLength(0)
    })
  })
})
