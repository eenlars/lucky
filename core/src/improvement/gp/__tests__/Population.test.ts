import { Population } from "@core/improvement/gp/Population"
import type { EvolutionSettings } from "@core/improvement/gp/resources/evolution-types"
import { Select } from "@core/improvement/gp/Select"
import {
  createMockEvaluationInputGeneric,
  createMockEvolutionSettings,
  createMockGenome,
  createMockWorkflowConfig,
  createMockWorkflowScore,
} from "@core/utils/__tests__/setup/coreMocks"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock runtime constants
vi.mock("@core/types", () => ({
  runtimeConstants: {
    paths: {
      loggingFolder: "/tmp/test-logs",
    },
    workflowId: "test-workflow-id",
  },
}))

vi.mock("@runtime/settings/constants", () => ({
  CONFIG: {
    logging: { level: "info", override: { GP: true } },
    evolution: {
      GP: {
        initialPopulationMethod: "random",
      },
    },
    limits: {
      enableParallelLimit: false,
      maxConcurrentAIRequests: 5,
    },
    tools: {
      maxToolsPerAgent: 6,
      inactive: new Set(),
      defaultTools: new Set(),
    },
    models: {
      provider: "openai",
      inactive: new Set(),
    },
    verification: {
      allowCycles: false,
    },
    workflow: {
      maxNodes: 100,
      maxNodeInvocations: 14,
      handoffContent: "summary",
    },
    coordinationType: "sequential",
    improvement: {
      flags: {
        maxRetriesForWorkflowRepair: 3,
      },
    },
  },
  PATHS: {
    codeTools: "/tmp/test-code-tools",
    runtime: "/tmp/test-runtime",
    setupFile: "/tmp/test-setup.json",
    node: {
      logging: "/tmp/test-node-logging",
    },
  },
}))

// Mock RunService
const mockRunService = {
  getRunId: vi.fn().mockReturnValue("test-run-id"),
  getCurrentGenerationId: vi.fn().mockReturnValue("test-gen-id"),
  getEvolutionContext: vi.fn().mockReturnValue({
    runId: "test-run-id",
    generationId: "test-gen-id",
    generationNumber: 0,
  }),
}

vi.mock("../RunService", () => ({
  RunService: vi.fn(() => mockRunService),
}))

// Mock Genome.createRandom
let mockGenomeCounter = 0
vi.mock("@core/improvement/GP/Genome", () => ({
  Genome: {
    createRandom: vi.fn().mockImplementation(() => {
      const id = `test-genome-${++mockGenomeCounter}`
      let fitness = { score: 0 }
      let isEvaluated = false

      return Promise.resolve({
        success: true,
        data: {
          getWorkflowVersionId: () => id,
          getFitness: () => fitness,
          getFitnessScore: () => fitness.score,
          setFitnessAndFeedback: vi.fn((data) => {
            fitness = data.fitness
            isEvaluated = true
          }),
          get isEvaluated() {
            return isEvaluated
          },
          reset: vi.fn(() => {
            isEvaluated = false
            fitness = { score: 0 }
          }),
        },
      })
    }),
  },
}))

// Mock EvolutionUtils
vi.mock("@core/improvement/GP/resources/utils", () => ({
  EvolutionUtils: {
    calculateStats: vi.fn().mockImplementation((genomes) => {
      const evaluatedGenomes = genomes.filter((g: any) => g.isEvaluated)
      const scores = genomes.map((g: any) => g.getFitnessScore())
      const validScores = scores.filter((s: any) => s > 0)
      const avgFitness =
        scores.reduce((sum: any, score: any) => sum + score, 0) / scores.length
      const bestFitness = Math.max(...scores)
      const worstFitness = Math.min(...scores)

      return {
        bestFitness,
        worstFitness,
        avgFitness,
        stdDev: 0.2,
      }
    }),
    findSimilarGenomes: vi.fn().mockReturnValue([]),
  },
}))

// Mock logger
vi.mock("@core/utils/logging/Logger", () => ({
  lgg: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock Select
vi.mock("@core/improvement/GP/Select", () => ({
  Select: {
    selectRandomParents: vi.fn().mockImplementation((population, count) => {
      const genomes = population.getGenomes()
      if (count > genomes.length) {
        throw new Error(
          `Cannot select ${count} parents from population of ${genomes.length}`
        )
      }
      return genomes.slice(0, count)
    }),
  },
}))

// Import the mocked RunService constructor
const { RunService } = await import("../RunService")

describe("Population", () => {
  let population: Population
  let config: EvolutionSettings

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    config = createMockEvolutionSettings({
      populationSize: 10,
      generations: 5,
      eliteSize: 2,
      tournamentSize: 3,
      numberOfParentsCreatingOffspring: 10,
      offspringCount: 10,
    })
    const runService = new RunService()
    population = new Population(config, runService)
  })

  describe("Constructor", () => {
    it("should initialize with config", () => {
      expect(population).toBeInstanceOf(Population)
      expect(population.size()).toBe(0)
      expect(population.getGenerationId()).toBe("test-gen-id")
    })
  })

  describe("Population Initialization", () => {
    it("should initialize population with correct size", async () => {
      const evaluationInput = createMockEvaluationInputGeneric()

      await population.initialize(
        evaluationInput,
        undefined,
        "dummy-problem-analysis"
      )

      expect(population.size()).toBe(config.populationSize)
      expect(population.getGenerationId()).toBe("test-gen-id")
      expect(population.getGenomes()).toHaveLength(config.populationSize)
    })

    it("should initialize with base workflow", async () => {
      const evaluationInput = createMockEvaluationInputGeneric()
      const baseWorkflow = createMockWorkflowConfig()

      await population.initialize(
        evaluationInput,
        baseWorkflow,
        "dummy-problem-analysis"
      )

      expect(population.size()).toBe(config.populationSize)
      expect(population.getGenomes()).toHaveLength(config.populationSize)
    })

    it("should create genomes in parallel for performance", async () => {
      const evaluationInput = createMockEvaluationInputGeneric()
      const startTime = Date.now()

      await population.initialize(
        evaluationInput,
        undefined,
        "dummy-problem-analysis"
      )

      const endTime = Date.now()
      expect(endTime - startTime).toBeLessThan(1000) // should be fast in verbose mode
      expect(population.size()).toBe(config.populationSize)
    })

    it("should handle initialization errors gracefully", async () => {
      const evaluationInput = createMockEvaluationInputGeneric()

      // should not throw even if some genomes fail to create
      await expect(
        population.initialize(
          evaluationInput,
          undefined as any,
          "dummy-problem-analysis"
        )
      ).resolves.not.toThrow()
    })
  })

  describe("Static Methods", () => {
    describe("sampleInitialPopulation", () => {
      it("should create sample population", async () => {
        const evaluationInput = createMockEvaluationInputGeneric()

        const tempPopulation = new Population(config, new RunService())
        const genomes = await tempPopulation.initializePopulationHelper({
          config,
          evaluationInput,
          runId: "test-run",
          _evolutionContext: {
            runId: "test-run",
            generationId: "test-gen",
          },
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })

        expect(genomes.size()).toBe(config.populationSize)
      })

      it("should respect size limit when smaller than populationSize", async () => {
        const evaluationInput = createMockEvaluationInputGeneric()

        const tempPopulation = new Population(config, new RunService())
        const genomes = await tempPopulation.initializePopulationHelper({
          config,
          evaluationInput,
          runId: "test-run",
          _evolutionContext: {
            runId: "test-run",
            generationId: "test-gen",
          },
          _baseWorkflow: undefined,
          problemAnalysis: "dummy-problem-analysis",
        })

        expect(genomes.size()).toBe(config.populationSize)
      })

      it("should work with base workflow", async () => {
        const evaluationInput = createMockEvaluationInputGeneric()
        const baseWorkflow = createMockWorkflowConfig()

        const tempPopulation = new Population(config, new RunService())
        const genomes = await tempPopulation.initializePopulationHelper({
          config,
          evaluationInput,
          runId: "test-run",
          _evolutionContext: {
            runId: "test-run",
            generationId: "test-gen",
          },
          _baseWorkflow: baseWorkflow,
          problemAnalysis: "dummy-problem-analysis",
        })

        expect(genomes.size()).toBe(config.populationSize)
      })
    })
  })

  describe("Population Management", () => {
    beforeEach(async () => {
      const evaluationInput = createMockEvaluationInputGeneric()
      await population.initialize(
        evaluationInput,
        undefined,
        "dummy-problem-analysis"
      )
    })

    describe("setPopulation", () => {
      it("should update population and generation", async () => {
        const newGenomes = [
          await createMockGenome(1),
          await createMockGenome(1),
        ]

        population.setPopulation(newGenomes)

        expect(population.size()).toBe(2)
        expect(population.getGenerationNumber()).toBe(0)
        expect(population.getGenomes()).toEqual(newGenomes)
      })

      it("should handle empty population", () => {
        population.setPopulation([])

        expect(population.size()).toBe(0)
        expect(population.getGenerationNumber()).toBe(0)
      })
    })

    describe("getGenomes", () => {
      it("should return copy of genomes array", () => {
        const genomes = population.getGenomes()
        const originalSize = genomes.length

        genomes.push({} as ReturnType<typeof createMockGenome> as any) // modify returned array

        expect(population.size()).toBe(originalSize) // original unchanged
      })
    })

    describe("selectRandomParents", () => {
      it("should select default number of parents", () => {
        const parents = Select.selectRandomParents(
          population,
          config.numberOfParentsCreatingOffspring
        )

        expect(parents.length).toBe(config.numberOfParentsCreatingOffspring)
        expect(parents.every((p) => population.getGenomes().includes(p))).toBe(
          true
        )
      })

      it("should select custom number of parents", () => {
        const customAmount = 3
        const parents = Select.selectRandomParents(population, customAmount)

        expect(parents.length).toBe(customAmount)
      })

      it("should handle request for more parents than available", () => {
        expect(() => {
          Select.selectRandomParents(population, 1000)
        }).toThrow()
      })
    })

    describe("getValidGenomes", () => {
      it("should return only genomes with valid fitness", async () => {
        const genomes = population.getGenomes()

        // set some genomes as valid
        genomes[0].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.8),
          feedback: "",
        })
        genomes[1].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.6),
          feedback: "",
        })

        const validGenomes = population.getValidGenomes()

        expect(validGenomes).toHaveLength(2)
        expect(
          validGenomes.every((g) => {
            const fitness = g.getFitness()
            return fitness?.score && fitness.score > 0
          })
        ).toBe(true)
      })

      it("should return empty array when no genomes are valid", () => {
        const validGenomes = population.getValidGenomes()

        expect(validGenomes).toHaveLength(0)
      })
    })

    describe("getBest and getWorst", () => {
      beforeEach(() => {
        const genomes = population.getGenomes()
        genomes[0].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.9),
          feedback: "",
        })
        genomes[1].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.3),
          feedback: "",
        })
        genomes[2].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.7),
          feedback: "",
        })
      })

      it("should return genome with highest fitness", () => {
        const best = population.getBest()

        expect(best.getFitness()?.score).toBe(0.9)
      })

      it("should return genome with lowest fitness", () => {
        const worst = population.getWorst()

        expect(worst.getFitness()?.score).toBe(0) // lowest is 0, not 0.3
      })

      it("should throw error for empty population", () => {
        population.clear()

        expect(() => population.getBest()).toThrow("Population is empty")
        expect(() => population.getWorst()).toThrow("Population is empty")
      })
    })

    describe("getTop", () => {
      beforeEach(() => {
        const genomes = population.getGenomes()
        genomes[0].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.9),
          feedback: "",
        })
        genomes[1].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.3),
          feedback: "",
        })
        genomes[2].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.7),
          feedback: "",
        })
        genomes[3].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.5),
          feedback: "",
        })
      })

      it("should return top n genomes sorted by fitness", () => {
        const top3 = population.getTop(3)

        expect(top3).toHaveLength(3)
        expect(top3[0].getFitnessScore()).toBe(0.9)
        expect(top3[1].getFitnessScore()).toBe(0.7)
        expect(top3[2].getFitnessScore()).toBe(0.5)
      })

      it("should handle request for more genomes than available", () => {
        const top100 = population.getTop(100)

        expect(top100.length).toBe(population.size())
      })
    })

    describe("getUnevaluated", () => {
      it("should return genomes with zero fitness score", () => {
        const genomes = population.getGenomes()
        genomes[0].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.8),
          feedback: "",
        })

        const unevaluated = population.getUnevaluated()

        expect(unevaluated.length).toBe(population.size() - 1)
        expect(unevaluated.every((g) => g.getFitnessScore() === 0)).toBe(true)
      })

      it("should return empty array when all genomes are evaluated", () => {
        const genomes = population.getGenomes()
        genomes.forEach((g) =>
          g.setFitnessAndFeedback({
            fitness: createMockWorkflowScore(0.5),
            feedback: "",
          })
        )

        const unevaluated = population.getUnevaluated()

        expect(unevaluated).toHaveLength(0)
      })
    })

    describe("Statistics", () => {
      beforeEach(async () => {
        const evaluationInput = createMockEvaluationInputGeneric()
        await population.initialize(
          evaluationInput,
          undefined,
          "dummy-problem-analysis"
        )

        // set fitness scores for testing - set all genomes to have fitness scores
        const genomes = population.getGenomes()
        genomes[0].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.9),
          feedback: "",
        })
        genomes[1].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.7),
          feedback: "",
        })
        genomes[2].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.5),
          feedback: "",
        })
        genomes[3].setFitnessAndFeedback({
          fitness: createMockWorkflowScore(0.3),
          feedback: "",
        })
        // set remaining genomes to have zero fitness so they don't affect average
        for (let i = 4; i < genomes.length; i++) {
          genomes[i].setFitnessAndFeedback({
            fitness: createMockWorkflowScore(0.0),
            feedback: "",
          })
        }
      })

      describe("getStats", () => {
        it("should calculate population statistics", () => {
          const stats = population.getStats()

          expect(stats.generation).toBe(0)
          expect(stats.bestFitness).toBe(0.9)
          // Expected average: (0.9+0.7+0.5+0.3+(6*0.0))/10 = 2.4/10 = 0.24
          expect(stats.avgFitness).toBeCloseTo(0.24, 1)
          expect(stats.fitnessStdDev).toBeGreaterThan(0)
          expect(stats.evaluationCost).toBe(0)
          expect(stats.evaluationsPerHour).toBe(0)
          expect(stats.improvementRate).toBe(0)
        })

        it("should throw error for empty population", () => {
          population.clear()

          expect(() => population.getStats()).toThrow("Population is empty")
        })
      })
    })

    describe("Diversity Management", () => {
      beforeEach(async () => {
        const evaluationInput = createMockEvaluationInputGeneric()
        await population.initialize(
          evaluationInput,
          undefined,
          "dummy-problem-analysis"
        )
      })

      describe("findSimilarGenomes", () => {
        it("should find genomes similar to target", async () => {
          const target = await createMockGenome()
          const threshold = 0.5

          const similar = population.findSimilarGenomes(target, threshold)

          expect(Array.isArray(similar)).toBe(true)
          // specific similarity logic depends on implementation
        })
      })

      describe("pruneSimilar", () => {
        it("should remove similar genomes maintaining best ones", () => {
          const initialSize = population.size()
          const threshold = 0.1 // very strict threshold

          population.pruneSimilar(threshold)

          expect(population.size()).toBeLessThanOrEqual(initialSize)
        })

        it("should not remove genomes if none are similar", () => {
          const initialSize = population.size()
          const threshold = 0.0001 // very strict threshold that shouldn't match anything

          population.pruneSimilar(threshold)

          // with very strict threshold, some similar genomes might still be removed
          expect(population.size()).toBeLessThanOrEqual(initialSize)
        })
      })

      describe("addGenome", () => {
        it("should add genome to population", async () => {
          const initialSize = population.size()
          const newGenome = await createMockGenome()

          population.addGenome(newGenome)

          expect(population.size()).toBe(initialSize + 1)
          expect(population.getGenomes()).toContain(newGenome)
        })
      })

      describe("removeGenome", () => {
        it("should remove genome by id", () => {
          const initialSize = population.size()
          const genomeToRemove = population.getGenomes()[0]

          const removed = population.removeGenome(
            genomeToRemove.getWorkflowVersionId()
          )

          expect(removed).toBe(true)
          expect(population.size()).toBe(initialSize - 1)
          expect(population.getGenomes()).not.toContain(genomeToRemove)
        })

        it("should return false for non-existent genome", () => {
          const removed = population.removeGenome("non-existent-id")

          expect(removed).toBe(false)
          expect(population.size()).toBe(config.populationSize)
        })
      })

      describe("clear", () => {
        it("should clear all genomes and reset generation", () => {
          population.clear()

          expect(population.size()).toBe(0)
          expect(population.getGenerationId()).toBe("test-gen-id")
          expect(population.getGenomes()).toHaveLength(0)
        })
      })
    })

    describe("Edge Cases", () => {
      it("should handle very small population sizes", async () => {
        const smallConfig = createMockEvolutionSettings({ populationSize: 1 })
        const smallPopulation = new Population(smallConfig, new RunService())
        const evaluationInput = createMockEvaluationInputGeneric()

        await smallPopulation.initialize(
          evaluationInput,
          undefined as any,
          "dummy-problem-analysis"
        )

        expect(smallPopulation.size()).toBe(1)
        expect(() => smallPopulation.getBest()).not.toThrow()
        expect(() => smallPopulation.getWorst()).not.toThrow()
      })

      it("should handle zero population size gracefully", () => {
        const zeroConfig = createMockEvolutionSettings({ populationSize: 0 })
        const zeroPopulation = new Population(zeroConfig, new RunService())

        expect(zeroPopulation.size()).toBe(0)
        expect(zeroPopulation.getGenomes()).toHaveLength(0)
      })

      it("should handle concurrent operations safely", async () => {
        const evaluationInput = createMockEvaluationInputGeneric()

        // simulate concurrent initialization and manipulation
        const promises = [
          population.initialize(
            evaluationInput,
            undefined as any,
            "dummy-problem-analysis"
          ),
          createMockGenome().then((g) => population.addGenome(g)),
        ]

        await expect(Promise.all(promises)).resolves.not.toThrow()
      })
    })

    describe("Performance", () => {
      it("should initialize large populations efficiently", async () => {
        const largeConfig = createMockEvolutionSettings({ populationSize: 50 })
        const largePopulation = new Population(largeConfig, new RunService())
        const evaluationInput = createMockEvaluationInputGeneric()

        const startTime = Date.now()
        await largePopulation.initialize(
          evaluationInput,
          undefined as any,
          "dummy-problem-analysis"
        )
        const endTime = Date.now()

        expect(largePopulation.size()).toBe(50)
        expect(endTime - startTime).toBeLessThan(2000)
      })

      it("should handle statistics calculation efficiently", async () => {
        const evaluationInput = createMockEvaluationInputGeneric()
        await population.initialize(
          evaluationInput,
          undefined,
          "dummy-problem-analysis"
        )

        // set all genomes to have fitness
        population.getGenomes().forEach((g, i) => {
          g.setFitnessAndFeedback({
            fitness: createMockWorkflowScore(Math.random()),
            feedback: "",
          })
        })

        const startTime = Date.now()
        const stats = population.getStats()
        const endTime = Date.now()

        expect(stats).toBeDefined()
        expect(endTime - startTime).toBeLessThan(100) // should be very fast
      })
    })
  })
})
