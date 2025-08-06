import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock only what's absolutely necessary for Population class to work
vi.mock("@core/utils/logging/Logger", () => ({
  lgg: {
    info: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@runtime/settings/constants", () => ({
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

// Mock Genome class to avoid complex genome creation
vi.mock("../Genome", () => ({
  Genome: {
    createRandom: vi.fn().mockResolvedValue({
      success: true,
      data: {
        workflowVersionId: `test-genome-${Math.random()}`,
        getWorkflowVersionId: () => `test-genome-${Math.random()}`,
        getFitness: () => ({ score: 0.5, valid: true }),
        getFitnessScore: () => 0.5,
        setFitnessAndFeedback: vi.fn(),
        isEvaluated: true,
      },
    }),
  },
}))

// Mock RunService
vi.mock("../RunService", () => ({
  RunService: vi.fn().mockImplementation(() => ({
    getRunId: vi.fn().mockReturnValue("test-run-id"),
    getCurrentGenerationId: vi.fn().mockReturnValue("test-gen-id"),
  })),
}))

// Clear any existing Population mock from other test files
vi.unmock("../Population")

// Helper function to create mock evolution settings
const createMockEvolutionSettings = (overrides = {}) => ({
  mode: "GP" as const,
  mutationRate: 0.1,
  populationSize: 5,
  generations: 3,
  maxCostUSD: 1.0,
  eliteSize: 1,
  tournamentSize: 2,
  crossoverRate: 0.7,
  mutationParams: {
    mutationInstructions: "test mutation",
  },
  maxEvaluationsPerHour: 100,
  offspringCount: 5,
  numberOfParentsCreatingOffspring: 2,
  evaluationDataset: "test",
  baselineComparison: false,
  ...overrides,
})

describe("Population Basic Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should instantiate with proper configuration", async () => {
    const { Population } = await import("@core/improvement/gp/Population")
    
    const mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue(0),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
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

  it("should support basic population operations", async () => {
    const { Population } = await import("@core/improvement/gp/Population")
    
    const mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue(0),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
    }

    const config = createMockEvolutionSettings({ populationSize: 5 })
    const population = new Population(config, mockRunService as any)
    
    // Create proper mock genomes that match Population class expectations
    const mockGenome1 = {
      getWorkflowVersionId: () => "genome1",
      getFitness: () => ({ score: 0.8 }),
      getFitnessScore: () => 0.8,
      isEvaluated: true,
    }
    const mockGenome2 = {
      getWorkflowVersionId: () => "genome2", 
      getFitness: () => ({ score: 0.6 }),
      getFitnessScore: () => 0.6,
      isEvaluated: true,
    }
    
    // Test setPopulation and size
    population.setPopulation([mockGenome1, mockGenome2] as any)
    expect(population.size()).toBe(2)
    expect(population.getGenomes()).toHaveLength(2)
    
    // Test addGenome
    const mockGenome3 = {
      getWorkflowVersionId: () => "genome3",
      getFitness: () => ({ score: 0.9 }),
      getFitnessScore: () => 0.9,
      isEvaluated: true,
    }
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

  it("should handle genome filtering correctly", async () => {
    const { Population } = await import("@core/improvement/gp/Population")
    
    const mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue(0),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
    }

    const config = createMockEvolutionSettings({ populationSize: 5 })
    const population = new Population(config, mockRunService as any)
    
    // Mix of evaluated and unevaluated genomes
    const evaluatedGenome = {
      getWorkflowVersionId: () => "evaluated",
      getFitness: () => ({ score: 0.8 }),
      getFitnessScore: () => 0.8,
      isEvaluated: true,
    }
    const unevaluatedGenome = {
      getWorkflowVersionId: () => "unevaluated",
      getFitness: () => null,
      getFitnessScore: () => 0,
      isEvaluated: false,
    }
    
    population.setPopulation([evaluatedGenome, unevaluatedGenome] as any)
    
    // Test filtering methods
    const validGenomes = population.getValidGenomes()
    expect(validGenomes).toHaveLength(1)
    expect(validGenomes[0].getWorkflowVersionId()).toBe("evaluated")
    
    const unevaluated = population.getUnevaluated()
    expect(unevaluated).toHaveLength(1)
    expect(unevaluated[0].getWorkflowVersionId()).toBe("unevaluated")
    
    // Test getTop sorting
    const anotherGenome = {
      getWorkflowVersionId: () => "another",
      getFitness: () => ({ score: 0.5 }),
      getFitnessScore: () => 0.5,
      isEvaluated: true,
    }
    population.addGenome(anotherGenome as any)
    
    const top2 = population.getTop(2)
    expect(top2).toHaveLength(2)
    expect(top2[0].getFitnessScore()).toBe(0.8) // Highest first
    expect(top2[1].getFitnessScore()).toBe(0.5)
  })

  it("should handle error cases properly", async () => {
    const { Population } = await import("@core/improvement/gp/Population")
    
    const mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue(0),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
    }

    const config = createMockEvolutionSettings({ populationSize: 0 })
    const population = new Population(config, mockRunService as any)
    
    // Test empty population error cases
    expect(() => population.getBest()).toThrow("Population is empty")
    expect(() => population.getWorst()).toThrow("Population is empty")
    expect(() => population.getStats()).toThrow("Population is empty")
    
    // Test successful edge cases
    expect(population.removeGenome("non-existent")).toBe(false)
    expect(population.getTop(5)).toEqual([])
    
    // Test single genome case
    const genome = {
      getWorkflowVersionId: () => "single",
      getFitness: () => ({ score: 0.5 }),
      getFitnessScore: () => 0.5,
      isEvaluated: true,
    }
    
    population.addGenome(genome as any)
    expect(population.getBest()).toBe(genome)
    expect(population.getWorst()).toBe(genome)
  })
})