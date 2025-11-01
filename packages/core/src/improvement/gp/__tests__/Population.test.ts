import { beforeEach, describe, expect, it, vi } from "vitest"
import { createMockEvolutionSettings, createMockGenome, createMockGenomes } from "./fixtures/population-mocks"

// Mock only what's absolutely necessary for Population class to work
vi.mock("@core/utils/logging/Logger", () => ({
  lgg: {
    info: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@examples/settings/constants", () => ({
  CONFIG: {
    evolution: {
      GP: {
        initialPopulationMethod: "random",
        populationSize: 5,
      },
    },
    logging: {
      override: {
        GP: false,
      },
    },
  },
}))

// Mock RunService
vi.mock("../RunService", () => ({
  RunService: vi.fn().mockImplementation(() => ({
    getRunId: vi.fn().mockReturnValue("test-run-id"),
    getCurrentGenerationId: vi.fn().mockReturnValue("test-gen-id"),
  })),
}))

// Mock Population helper methods that are used in initialize()
vi.mock("@core/improvement/gp/rsc/utils", () => ({
  EvolutionUtils: {
    calculateStats: vi.fn().mockReturnValue({
      avgFitness: 0.7,
      bestFitness: 0.9,
      worstFitness: 0.5,
      stdDev: 0.1,
      diversity: 0.6,
    }),
  },
}))

// Clear any existing Population mock from other test files.
// Import this module via a relative path to avoid alias-based mocks
// defined elsewhere (e.g. in EvolutionEngine tests).
vi.unmock("../Population")

// Ensure a clean module registry before each dynamic import so prior
// mocks don't leak across test files.
beforeEach(() => {
  vi.resetModules()
})

// Mock Genome class to avoid complex genome creation
vi.mock("../Genome", () => ({
  Genome: {
    // TODO: Genome.createRandom mock is overly complex for unit tests
    // creates coupling between test and implementation details
    createRandom: vi.fn().mockImplementation(async () => ({
      success: true,
      data: {
        workflowVersionId: `test-genome-${Math.random()}`,
        getWorkflowVersionId: () => `test-genome-${Math.random()}`,
        getFitness: () => ({ score: 0.5, valid: true }),
        getFitnessScore: () => 0.5,
        setFitnessAndFeedback: vi.fn(),
        isEvaluated: true,
      },
    })),
  },
}))

describe("Population", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should instantiate with proper configuration", async () => {
    const { Population } = await vi.importActual<typeof import("../Population")>("../Population")

    const mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue(0),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
      getEvolutionContext: vi.fn().mockReturnValue({
        runId: "test-run-id",
        generationId: "test-gen-id",
        generationNumber: 0,
      }),
    }
    const config = createMockEvolutionSettings({
      populationSize: 5,
      generations: 3,
    })

    const population = new Population(config, mockRunService as any)

    expect(population.size()).toBe(0)
    expect(population.getGenerationId()).toBe(0)
    expect(population.getGenomes()).toEqual([])
  })

  it("should initialize population container correctly", async () => {
    const { Population } = await vi.importActual<typeof import("../Population")>("../Population")

    const mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue(0),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
      getEvolutionContext: vi.fn().mockReturnValue({
        runId: "test-run-id",
        generationId: "test-gen-id",
        generationNumber: 0,
      }),
    }

    const config = createMockEvolutionSettings({
      populationSize: 5,
      generations: 3,
    })

    const population = new Population(config, mockRunService as any)

    // Test basic population setup (before initialization)
    expect(population.size()).toBe(0)
    expect(population.getGenomes()).toEqual([])
    expect(population.getGenerationNumber()).toBe(0)

    // Test that we can add genomes manually to simulate initialization
    const mockGenomes = Array.from({ length: 5 }, (_, i) => ({
      getWorkflowVersionId: () => `genome${i}`,
      getFitness: () => ({ score: 0.5, valid: true }),
      getFitnessScore: () => 0.5,
      isEvaluated: true,
    }))

    population.setPopulation(mockGenomes as any)
    expect(population.size()).toBe(5)
    expect(population.getGenomes()).toHaveLength(5)
  })

  it("should handle population setup with different configurations", async () => {
    const { Population } = await vi.importActual<typeof import("../Population")>("../Population")

    const mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue(0),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
      getEvolutionContext: vi.fn().mockReturnValue({
        runId: "test-run-id",
        generationId: "test-gen-id",
        generationNumber: 0,
      }),
    }

    const config = createMockEvolutionSettings({ populationSize: 3 })
    const population = new Population(config, mockRunService as any)

    // Test configuration is stored correctly
    expect(population.size()).toBe(0)
    expect(population.getGenomes()).toEqual([])

    // Test that we can manually set population size to match config
    const mockGenomes = Array.from({ length: 3 }, (_, i) => ({
      getWorkflowVersionId: () => `workflow-genome${i}`,
      getFitness: () => ({ score: 0.6 + i * 0.1, valid: true }),
      getFitnessScore: () => 0.6 + i * 0.1,
      isEvaluated: true,
    }))

    population.setPopulation(mockGenomes as any)
    expect(population.size()).toBe(3)
    expect(population.getGenomes()).toHaveLength(3)
  })

  it("should support basic population operations (add, remove, clear)", async () => {
    const { Population } = await vi.importActual<typeof import("../Population")>("../Population")

    const mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue(0),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
    }
    const config = createMockEvolutionSettings({ populationSize: 5 })
    const population = new Population(config, mockRunService as any)

    // Create proper mock genomes
    const mockGenome1 = createMockGenome("genome1", 0.8)
    const mockGenome2 = createMockGenome("genome2", 0.6)
    const mockGenome3 = createMockGenome("genome3", 0.9)

    // Test setPopulation and size
    population.setPopulation([mockGenome1, mockGenome2] as any)
    expect(population.size()).toBe(2)
    expect(population.getGenomes()).toHaveLength(2)

    // Test addGenome
    population.addGenome(mockGenome3 as any)
    expect(population.size()).toBe(3)

    // Test getBest/getWorst
    const best = population.getBest()
    expect(best.getFitnessScore()).toBe(0.9)

    const worst = population.getWorst()
    expect(worst.getFitnessScore()).toBe(0.6)

    // Test removeGenome
    expect(population.removeGenome("genome2")).toBe(true)
    expect(population.size()).toBe(2)

    // Test clear
    population.clear()
    expect(population.size()).toBe(0)
  })

  it("should handle comprehensive genome operations", async () => {
    const { Population } = await vi.importActual<typeof import("../Population")>("../Population")

    const mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue(0),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
    }

    const config = createMockEvolutionSettings({ populationSize: 10 })
    const population = new Population(config, mockRunService as any)

    // Create realistic test genomes
    const genomes = [
      {
        getWorkflowVersionId: () => "genome1",
        getFitness: () => ({ score: 0.9, valid: true }),
        getFitnessScore: () => 0.9,
        isEvaluated: true,
        setFitnessAndFeedback: vi.fn(),
      },
      {
        getWorkflowVersionId: () => "genome2",
        getFitness: () => ({ score: 0.7, valid: true }),
        getFitnessScore: () => 0.7,
        isEvaluated: true,
        setFitnessAndFeedback: vi.fn(),
      },
      {
        getWorkflowVersionId: () => "genome3",
        getFitness: () => ({ score: 0.5, valid: true }),
        getFitnessScore: () => 0.5,
        isEvaluated: true,
        setFitnessAndFeedback: vi.fn(),
      },
    ]

    population.setPopulation(genomes as any)

    // Test basic operations
    expect(population.size()).toBe(3)
    expect(population.getGenomes()).toHaveLength(3)

    // Test getBest/getWorst
    const best = population.getBest()
    expect(best.getFitnessScore()).toBe(0.9)

    const worst = population.getWorst()
    expect(worst.getFitnessScore()).toBe(0.5)

    // Test getTop sorting
    const top2 = population.getTop(2)
    expect(top2).toHaveLength(2)
    expect(top2[0].getFitnessScore()).toBe(0.9) // Highest first
    expect(top2[1].getFitnessScore()).toBe(0.7)

    // Test getValidGenomes
    const validGenomes = population.getValidGenomes()
    expect(validGenomes).toHaveLength(3) // All are evaluated

    // Test statistics
    const stats = population.getStats()
    expect(stats).toBeDefined()
    expect(stats.generation).toBe(0)
    expect(stats.bestFitness).toBe(0.9)
    // TODO: using toBeCloseTo with tolerance might be too loose
    // missing validation of standard deviation and diversity metrics
    expect(stats.avgFitness).toBeCloseTo(0.7, 1) // (0.9 + 0.7 + 0.5) / 3
  })

  it("should handle unevaluated genomes correctly", async () => {
    const { Population } = await vi.importActual<typeof import("../Population")>("../Population")

    const mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue(0),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
    }

    const config = createMockEvolutionSettings({ populationSize: 5 })
    const population = new Population(config, mockRunService as any)

    const genomes = [
      {
        getWorkflowVersionId: () => "evaluated",
        getFitness: () => ({ score: 0.8, valid: true }),
        getFitnessScore: () => 0.8,
        isEvaluated: true,
      },
      {
        getWorkflowVersionId: () => "unevaluated",
        getFitness: () => null,
        getFitnessScore: () => 0,
        isEvaluated: false,
      },
    ]

    population.setPopulation(genomes as any)

    // Test filtering methods
    const validGenomes = population.getValidGenomes()
    expect(validGenomes).toHaveLength(1)
    expect(validGenomes[0].getWorkflowVersionId()).toBe("evaluated")

    const unevaluated = population.getUnevaluated()
    expect(unevaluated).toHaveLength(1)
    expect(unevaluated[0].getWorkflowVersionId()).toBe("unevaluated")
  })

  it("should support diversity operations safely", async () => {
    const { Population } = await vi.importActual<typeof import("../Population")>("../Population")

    const mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue(0),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
    }

    const config = createMockEvolutionSettings({ populationSize: 5 })
    const population = new Population(config, mockRunService as any)

    // TODO: diversity operations tested superficially
    // only tests that methods don't throw, not their functionality
    // missing tests for actual similarity detection and pruning behavior
    // Test diversity methods exist and don't crash with empty population
    expect(typeof population.findSimilarGenomes).toBe("function")
    expect(typeof population.pruneSimilar).toBe("function")

    expect(() => population.pruneSimilar(0.1)).not.toThrow()
    expect(population.size()).toBe(0)
  })

  it("should handle edge cases and errors comprehensively", async () => {
    const { Population } = await vi.importActual<typeof import("../Population")>("../Population")

    const mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue(0),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
    }

    // Test zero population size
    const zeroPopulation = new Population(createMockEvolutionSettings({ populationSize: 0 }), mockRunService as any)
    expect(zeroPopulation.size()).toBe(0)
    expect(zeroPopulation.getGenomes()).toEqual([])

    // Test error cases
    expect(() => zeroPopulation.getBest()).toThrow("Population is empty")
    expect(() => zeroPopulation.getWorst()).toThrow("Population is empty")
    expect(() => zeroPopulation.getStats()).toThrow("Population is empty")

    // Test successful edge cases
    expect(zeroPopulation.removeGenome("non-existent")).toBe(false)
    expect(zeroPopulation.getTop(10)).toEqual([])

    // Test single genome case
    const singlePopulation = new Population(createMockEvolutionSettings({ populationSize: 1 }), mockRunService as any)
    const genome = {
      getWorkflowVersionId: () => "single",
      getFitness: () => ({ score: 0.5 }),
      getFitnessScore: () => 0.5,
      isEvaluated: true,
    }

    singlePopulation.addGenome(genome as any)
    expect(singlePopulation.getBest()).toBe(genome)
    expect(singlePopulation.getWorst()).toBe(genome)
  })
})
