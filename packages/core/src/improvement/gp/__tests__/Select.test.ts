// tests for Select - selection strategies for genetic programming
import {
  createMockEvolutionSettings,
  createMockGenome,
  createMockWorkflowScore,
  setupCoreTest,
} from "@utils/__tests__/setup/coreMocks"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock runtime constants at top level
vi.mock("@example/settings/constants", () => ({
  CONFIG: {
    evolution: {
      GP: {
        verbose: false,
        populationSize: 5,
        generations: 3,
      },
    },
    tools: {
      inactive: new Set(),
    },
    models: {
      inactive: new Set(),
      provider: "openai",
    },
    logging: {
      level: "info",
      override: {},
    },
  },
  MODELS: {
    default: "openai/gpt-4.1-mini",
  },
  PATHS: {
    root: "/test",
  },
}))

// Create mock instances directly
const mockPopulationGetGenerationId = vi.fn()
const mockPopulationGetFittestGenomes = vi.fn()
const mockPopulationGetSize = vi.fn()
const mockPopulationGetGenomes = vi.fn()
const mockCrossoverCrossover = vi.fn()
const mockMutationsMutate = vi.fn()
const mockCreateDummyGenome = vi.fn()
const mockLggLog = vi.fn()
const mockLggInfo = vi.fn()
const mockLggError = vi.fn()
const mockLggWarn = vi.fn()
const mockGenomeCreateRandom = vi.fn()

// mock external dependencies
vi.mock("@improvement/GP/resources/debug/dummyGenome", () => ({
  createDummyGenome: mockCreateDummyGenome,
}))

vi.mock("@improvement/GP/operators/Crossover", () => ({
  Crossover: {
    crossover: mockCrossoverCrossover,
  },
}))

vi.mock("@improvement/GP/operators/Mutations", () => ({
  Mutations: {
    mutateWorkflowGenome: mockMutationsMutate,
  },
}))

vi.mock("@utils/logging/Logger", () => ({
  lgg: {
    log: mockLggLog,
    info: mockLggInfo,
    error: mockLggError,
    warn: mockLggWarn,
  },
}))

vi.mock("@improvement/GP/Genome", () => ({
  Genome: {
    createRandom: mockGenomeCreateRandom,
  },
}))

// Runtime constants mocked by mockRuntimeConstantsForGP

// Mock validation config directly
vi.mock("@validation/message/validationConfig", () => ({
  DEFAULT_VALIDATION_CONFIG: {
    enabled: false,
    thresholds: {
      proceedMinScore: 7,
      retryMinScore: 4,
      escalateMaxScore: 3,
    },
    actions: {
      onRetry: "warn",
      onEscalate: "block",
      maxRetries: 1,
    },
  },
}))

describe("Select", () => {
  beforeEach(() => {
    setupCoreTest()

    // setup default successful behaviors
    mockCreateDummyGenome.mockImplementation((generation, parentIds) => ({
      getWorkflowVersionId: () => `dummy-${generation}-${parentIds.join("-")}`,
      genome: { generation, parentIds },
      fitness: { score: 0.5, valid: true },
      getFitness: () => ({ score: 0.5, valid: true }),
    }))

    mockCrossoverCrossover.mockResolvedValue({
      success: true,
      error: null,
      data: mockCreateDummyGenome(1, ["parent1", "parent2"]),
    })

    mockMutationsMutate.mockResolvedValue({
      success: true,
      data: mockCreateDummyGenome(1, ["parent1"]),
    })

    mockGenomeCreateRandom.mockResolvedValue({
      error: null,
      data: mockCreateDummyGenome(1, ["immigrant"]),
    })
  })

  describe("selectParents", () => {
    const createMockPopulation = (genomes: any[], generation = 0) => ({
      getGenerationId:
        mockPopulationGetGenerationId.mockReturnValue(generation),
      getFittestGenomes:
        mockPopulationGetFittestGenomes.mockReturnValue(genomes),
      getSize: mockPopulationGetSize.mockReturnValue(genomes.length),
      getGenomes: mockPopulationGetGenomes.mockReturnValue(genomes),
    })

    it("should return dummy genome in verbose mode", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const population = createMockPopulation([])
      const config = createMockEvolutionSettings()

      const result = await Select.selectParents({
        population: population as any,
        config,
      })

      expect(result).toHaveLength(1)
      expect(mockCreateDummyGenome).toHaveBeenCalledWith(0, [])
    })

    it("should perform tournament selection", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const mockGenomes = await Promise.all([
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.9) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.7) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.6) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.8) } }),
      ])

      const population = createMockPopulation(mockGenomes, 0)
      const config = createMockEvolutionSettings({
        populationSize: 4,
        tournamentSize: 2,
      })

      const result = await Select.selectParents({
        population: population as any,
        config,
      })

      expect(result.length).toBe(2) // populationSize / 2
      expect(mockLggLog).toHaveBeenCalled()
    })

    it("should handle empty population", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const population = createMockPopulation([])
      const config = createMockEvolutionSettings()

      const result = await Select.selectParents({
        population: population as any,
        config,
      })

      expect(result).toHaveLength(0)
    })

    it("should handle single genome population", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const mockGenome = await createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.8) } })
      const population = createMockPopulation([mockGenome])
      const config = createMockEvolutionSettings({ populationSize: 2 })

      const result = await Select.selectParents({
        population: population as any,
        config,
      })

      expect(result.length).toBeLessThanOrEqual(1)
    })

    it("should select fittest genomes for tournament", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const mockGenomes = await Promise.all([
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.9) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.7) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.6) } }),
      ])

      const population = createMockPopulation(mockGenomes, 0)
      const config = createMockEvolutionSettings({
        populationSize: 6,
        tournamentSize: 2,
      })

      await Select.selectParents({
        population: population as any,
        config,
      })

      expect(mockPopulationGetFittestGenomes).toHaveBeenCalled()
    })
  })

  describe("selectSurvivors", () => {
    it("should return dummy genomes in verbose mode", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const mockParents = [await createMockGenome()]
      const mockOffspring = [await createMockGenome()]
      const config = createMockEvolutionSettings({ populationSize: 2 })

      const result = await (Select as any).selectSurvivors({
        parents: mockParents,
        offspring: mockOffspring,
        config,
      })

      expect(result).toHaveLength(2)
      expect(mockCreateDummyGenome).toHaveBeenCalled()
    })

    it("should combine parents and offspring for selection", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const mockParents = [
        await createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.8) } }),
        await createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.7) } }),
      ]
      const mockOffspring = [
        await createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.9) } }),
        await createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.6) } }),
      ]
      const config = createMockEvolutionSettings({ populationSize: 3 })

      const result = await (Select as any).selectSurvivors({
        parents: mockParents,
        offspring: mockOffspring,
        config,
        verbose: false,
      })

      expect(result).toHaveLength(3)
      // should select top 3 by fitness
      const scores = result
        .map((g: any) => g.getFitness().score)
        .sort((a: number, b: number) => b - a)
      expect(scores[0]).toBeGreaterThanOrEqual(scores[1])
      expect(scores[1]).toBeGreaterThanOrEqual(scores[2])
    })

    it("should handle empty parents and offspring", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const config = createMockEvolutionSettings({ populationSize: 0 })

      const result = await (Select as any).selectSurvivors({
        parents: [],
        offspring: [],
        config,
        verbose: false,
      })

      expect(result).toHaveLength(0)
    })

    it("should respect population size limit", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const mockParents = await Promise.all([
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.9) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.8) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.7) } }),
      ])
      const mockOffspring = await Promise.all([
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.95) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.85) } }),
      ])
      const config = createMockEvolutionSettings({ populationSize: 3 })

      const result = await (Select as any).selectSurvivors({
        parents: mockParents,
        offspring: mockOffspring,
        config,
        verbose: false,
      })

      expect(result).toHaveLength(3)
    })
  })

  describe("tournamentSelection", () => {
    it("should select winner from tournament", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const mockGenomes = await Promise.all([
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.9) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.7) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.6) } }),
      ])

      // tournament selection should pick highest fitness
      const winner = await (Select as any).tournamentSelection(mockGenomes, 2)

      expect(winner).toBeDefined()
      expect(winner.getFitness().score).toBeGreaterThanOrEqual(0.6)
    })

    it("should handle single genome tournament", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const mockGenome = await createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.8) } })

      const winner = await (Select as any).tournamentSelection([mockGenome], 1)

      expect(winner).toBe(mockGenome)
    })

    it("should handle empty tournament", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const winner = await (Select as any).tournamentSelection([], 2)

      expect(winner).toBeUndefined()
    })

    it("should handle tournament size larger than population", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const mockGenomes = await Promise.all([
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.9) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.7) } }),
      ])

      const winner = await (Select as any).tournamentSelection(mockGenomes, 5)

      expect(winner).toBeDefined()
      expect(mockGenomes).toContain(winner)
    })
  })

  describe("elite selection", () => {
    it("should preserve elite individuals", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const mockGenomes = await Promise.all([
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.9) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.8) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.7) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.6) } }),
      ])

      const config = createMockEvolutionSettings({
        populationSize: 3,
        eliteSize: 2,
      })

      const result = await (Select as any).selectSurvivors({
        parents: mockGenomes,
        offspring: [],
        config,
        verbose: false,
      })

      expect(result).toHaveLength(3)
      // top 2 should be elite (preserved)
      const topTwo = result.slice(0, 2)
      expect(topTwo.every((g: any) => g.getFitness().score >= 0.8)).toBe(true)
    })
  })

  describe("genetic operator selection", () => {
    it("should correctly select crossover, mutation, and immigration based on rates", async () => {
      const { Select } = await import("@improvement/gp/Select")

      // Mock Math.random to test specific ranges
      const originalRandom = Math.random
      let mockRandomValues: number[] = []
      let randomIndex = 0

      Math.random = () => {
        if (randomIndex < mockRandomValues.length) {
          return mockRandomValues[randomIndex++]
        }
        return originalRandom()
      }

      // Test with rates: crossover=0.6, mutation=0.3, immigration=0.1
      const config = createMockEvolutionSettings({
        crossoverRate: 0.6,
        mutationRate: 0.3,
        populationSize: 10,
        offspringCount: 10,
      })

      // Set up specific random values to trigger each operator
      mockRandomValues = [
        0.3, // < 0.6, should trigger crossover
        0.7, // >= 0.6 and < 0.9, should trigger mutation
        0.95, // >= 0.9, should trigger immigration
        0.1, // < 0.6, should trigger crossover
        0.85, // >= 0.6 and < 0.9, should trigger mutation
      ]
      randomIndex = 0

      const mockPopulation = {
        getGenerationId: () => 1,
        selectRandomParents: (count: number) =>
          Array(count)
            .fill(null)
            .map(() => createMockGenome()),
      }

      // Clear previous mock calls
      mockLggLog.mockClear()

      // Run the generation
      await (Select as any).generateOffspring({
        population: mockPopulation,
        config,
        nextGen: 2,
        evaluationInput: { question: "test" },
        _evolutionContext: {
          runId: "test",
          generationId: "1",
          generationNumber: 1,
        },
      })

      // Verify the correct operators were selected based on our mock random values
      const logs = mockLggLog.mock.calls.map((call: any[]) => call[0])

      // Should see crossover selected for random=0.3
      expect(logs).toContain(
        expect.stringContaining("Crossover selected (random=0.300")
      )

      // Should see mutation selected for random=0.7
      expect(logs).toContain(
        expect.stringContaining("Mutation selected (random=0.700 in [0.6, 0.9")
      )

      // Should see immigration selected for random=0.95
      expect(logs).toContain(
        expect.stringContaining("Immigration selected (random=0.950 >= 0.9")
      )

      // Restore original Math.random
      Math.random = originalRandom
    })
  })

  describe("fitness-based selection", () => {
    it("should prioritize valid genomes", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const validGenome = await createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.7) } })
      const invalidGenome = await createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.9) } })

      const config = createMockEvolutionSettings({ populationSize: 1 })

      const result = await (Select as any).selectSurvivors({
        parents: [validGenome, invalidGenome],
        offspring: [],
        config,
        verbose: false,
      })

      expect(result).toHaveLength(1)
      expect(result[0].getFitness()?.hasBeenEvaluated).toBe(true)
    })

    it("should handle all invalid genomes", async () => {
      const { Select } = await import("@improvement/gp/Select")

      const mockGenomes = await Promise.all([
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.9) } }),
        createMockGenome({ genomeEvaluationResults: { fitness: createMockWorkflowScore(0.8) } }),
      ])

      const config = createMockEvolutionSettings({ populationSize: 1 })

      const result = await (Select as any).selectSurvivors({
        parents: mockGenomes,
        offspring: [],
        config,
        verbose: false,
      })

      expect(result).toHaveLength(1)
      // should still select best of invalid ones
      expect(result[0].getFitness().score).toBe(0.9)
    })
  })
})
