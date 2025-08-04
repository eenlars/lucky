// basic tests for population class
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock runtime constants at top level
vi.mock("@/runtime/settings/constants", () => ({
  PATHS: {
    codeTools: "/mock/code/tools/path",
    setupFile: "/mock/setup/file/path",
    node: {
      logging: "/mock/logging/path",
    },
  },
  CONFIG: {
    evolution: {
      GP: {
        verbose: false,
        populationSize: 5,
        generations: 3,
        maxCostUSD: 1.0,
        eliteSize: 1,
        tournamentSize: 2,
        crossoverRate: 0.7,
        maxEvaluationsPerHour: 100,
        mu_parents_to_keep: 5,
        lambda_offspring_to_produce: 5,
        rho_parent_amount: 2,
        evaluationDataset: "test",
        baselineComparison: false,
        mutationParams: {
          mutationInstructions: "test",
        },
      },
    },
    improvement: {
      flags: {
        maxRetriesForWorkflowRepair: 3,
      },
    },
    logging: { level: "info", override: { GP: true } },
    models: {
      inactive: new Set(["openai/gpt-4.1"]),
    },
    tools: {
      enable: { mcp: false, code: true },
    },
    limits: {
      enableParallelLimit: false,
    },
    workflow: {
      parallelExecution: false,
    },
    verification: {
      allowCycles: false,
    },
    coordinationType: "sequential",
    newNodeProbability: 0.7,
  },
}))

// mock logging
vi.mock("@/core/utils/logging/Logger", () => ({
  lgg: {
    log: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Runtime constants mocked by mockRuntimeConstantsForGP

// mock genome creation for initialization
vi.mock("@/core/improvement/GP/Genome", () => ({
  Genome: {
    createRandom: vi
      .fn()
      .mockImplementation(async ({ generation, parentIds }) => {
        return {
          workflowVersionId: `test-genome-${Math.random()}`,
          genome: {
            generation,
            parentIds,
            nodes: [{ id: "test" }],
            entryNodeId: "test",
          },
          getFitness: vi.fn().mockReturnValue({ score: 0, valid: false }),
          setFitness: vi.fn(),
          nodes: [{ id: "test" }],
        }
      }),
  },
}))

vi.mock("@/core/improvement/GP/resources/utils", () => ({
  EvolutionUtils: {
    calculateStats: vi.fn().mockReturnValue({
      bestFitness: 0.8,
      avgFitness: 0.6,
      stdDev: 0.2,
    }),
    findSimilarGenomes: vi.fn().mockReturnValue([]),
  },
}))

// Mock database operations
vi.mock("@/core/persistence/workflow/registerWorkflow", () => ({
  registerWorkflowInDatabase: vi.fn().mockResolvedValue({
    workflowVersionId: "test-version-id",
    workflowInvocationId: "test-invocation-id",
  }),
  ensureWorkflowExists: vi.fn().mockResolvedValue(undefined),
  createWorkflowVersion: vi.fn().mockResolvedValue(undefined),
  createWorkflowInvocation: vi.fn().mockResolvedValue(undefined),
}))

// Mock supabase client to avoid real database calls
vi.mock("@/core/utils/clients/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}))

import { Population } from "@/improvement/gp/Population"
import { Select } from "@/improvement/gp/Select"
import { createMockEvolutionSettings } from "@/utils/__tests__/setup/coreMocks"
import type { EvaluationInput } from "@/workflow/ingestion/ingestion.types"
import type { EvolutionSettings } from "@/improvement/gp/resources/evolution-types"

describe("Population Basic Tests", () => {
  let population: Population
  let config: EvolutionSettings
  let mockRunService: any

  beforeEach(() => {
    vi.clearAllMocks()
    config = createMockEvolutionSettings({
      mode: "GP",
      populationSize: 5,
      generations: 3,
      maxCostUSD: 1.0,
      dbPath: ":memory:",
      eliteSize: 1,
      tournamentSize: 2,
      crossoverRate: 0.7,
      maxEvaluationsPerHour: 100,
      mu_parents_to_keep: 5,
      lambda_offspring_to_produce: 5,
      rho_parent_amount: 2,
      evaluationDataset: "test",
      baselineComparison: false,
      mutationParams: {
        mutationInstructions: "test",
      },
    })

    mockRunService = {
      getCurrentRunId: vi.fn().mockReturnValue("test-run-id"),
      getCurrentGenerationId: vi.fn().mockReturnValue("test-generation-id"),
      getRunId: vi.fn().mockReturnValue("test-run-id"),
      getEvolutionContext: vi.fn().mockReturnValue({
        runId: "test-run-id",
        generationId: "test-generation-id",
        generationNumber: 0,
      }),
    } as any
    population = new Population(config, mockRunService)
  })

  describe("Constructor", () => {
    it("should initialize with config", () => {
      expect(population).toBeInstanceOf(Population)
      expect(population.size()).toBe(0)
      expect(population.getGenerationId()).toBe("test-generation-id")
    })
  })

  describe("Population Management", () => {
    it("should initialize population", async () => {
      // fails because: this.runService.getRunId is not a function - mockRunService doesn't have getRunId method
      const evaluationInput: EvaluationInput = {
        type: "csv",
        goal: "test",
        evaluation: "column:test",
        workflowId: "test-workflow-id",
      }

      await population.initialize(
        evaluationInput,
        undefined,
        "dummy-problem-analysis"
      )

      expect(population.size()).toBe(config.populationSize)
      expect(population.getGenomes()).toHaveLength(config.populationSize)
    })

    it("should set population", () => {
      // fails because: expected 'test-generation-id' to be 1 - getGenerationId returns string instead of number
      const mockGenomes = [
        {
          getWorkflowVersionId: () => "genome1",
          getFitness: () => ({ score: 0.8, valid: true }),
          getFitnessScore: () => 0.8,
          getFitnessAndFeedback: () => ({ score: 0.8, valid: true }),
        },
        {
          getWorkflowVersionId: () => "genome2",
          getFitness: () => ({ score: 0.6, valid: true }),
          getFitnessScore: () => 0.6,
          getFitnessAndFeedback: () => ({ score: 0.6, valid: true }),
        },
      ] as any[]

      population.setPopulation(mockGenomes)

      expect(population.size()).toBe(2)
      expect(population.getGenerationId()).toBe(1)
    })

    it("should get genomes copy", () => {
      const mockGenomes = [
        {
          getWorkflowVersionId: () => "genome1",
          getFitness: () => ({ score: 0.8, valid: true }),
        },
      ] as any[]

      population.setPopulation(mockGenomes)
      const genomes = population.getGenomes()

      expect(genomes).toHaveLength(1)
      expect(genomes).not.toBe(mockGenomes) // should be a copy
    })

    it("should select random parents", () => {
      // fails because: Target cannot be null or undefined - Select.selectRandomParents has null/undefined issue
      const mockGenomes = [
        {
          getWorkflowVersionId: () => "genome1",
          getFitnessScore: () => 0.8,
        },
        {
          getWorkflowVersionId: () => "genome2",
          getFitnessScore: () => 0.6,
        },
        {
          getWorkflowVersionId: () => "genome3",
          getFitnessScore: () => 0.4,
        },
      ] as any[]

      population.setPopulation(mockGenomes)
      const parents = Select.selectRandomParents(population, 2)

      expect(parents).toHaveLength(2)
    })

    it("should get valid genomes", () => {
      // fails because: expected [] to have a length of 1 - getValidGenomes returns empty array, validity check fails
      const mockGenomes = [
        {
          getWorkflowVersionId: () => "genome1",
          getFitness: () => ({ score: 0.8, valid: true }),
          getFitnessScore: () => 0.8,
        },
        {
          getWorkflowVersionId: () => "genome2",
          getFitness: () => ({ score: 0, valid: false }),
          getFitnessScore: () => 0,
        },
      ] as any[]

      population.setPopulation(mockGenomes)
      const validGenomes = population.getValidGenomes()

      expect(validGenomes).toHaveLength(1)
      expect(validGenomes[0].getWorkflowVersionId()).toBe("genome1")
    })

    it("should get unevaluated genomes", () => {
      // fails because: expected [2 items] to have length 1 - both genomes returned as unevaluated, evaluation logic issue
      const mockGenomes = [
        {
          getWorkflowVersionId: () => "genome1",
          getFitness: () => ({ score: 0.8 }),
          getFitnessScore: () => 0.8,
        },
        {
          getWorkflowVersionId: () => "genome2",
          getFitness: () => ({ score: 0 }),
          getFitnessScore: () => 0,
        },
      ] as any[]

      population.setPopulation(mockGenomes)
      const unevaluated = population.getUnevaluated()

      expect(unevaluated).toHaveLength(1)
      expect(unevaluated[0].getWorkflowVersionId()).toBe("genome2")
    })
  })

  describe("Best/Worst Selection", () => {
    beforeEach(() => {
      const mockGenomes = [
        {
          getWorkflowVersionId: () => "genome1",
          getFitness: () => ({ score: 0.9 }),
          getFitnessScore: () => 0.9,
        },
        {
          getWorkflowVersionId: () => "genome2",
          getFitness: () => ({ score: 0.3 }),
          getFitnessScore: () => 0.3,
        },
        {
          getWorkflowVersionId: () => "genome3",
          getFitness: () => ({ score: 0.7 }),
          getFitnessScore: () => 0.7,
        },
      ] as any[]

      population.setPopulation(mockGenomes)
    })

    it("should get best genome", () => {
      // fails because: Cannot read properties of undefined (reading 'getWorkflowVersionId') - getBest returns undefined
      const best = population.getBest()

      expect(best.getWorkflowVersionId()).toBe("genome1")
      expect(best.getFitness()?.score).toBe(0.9)
    })

    it("should get worst genome", () => {
      // fails because: current.getFitnessScore is not a function - fitness comparison method issue
      const worst = population.getWorst()

      expect(worst.getWorkflowVersionId()).toBe("genome2")
      expect(worst.getFitness()?.score).toBe(0.3)
    })

    it("should get top n genomes", () => {
      // fails because: b.getFitnessScore is not a function - sorting logic uses wrong method name
      const top2 = population.getTop(2)

      expect(top2).toHaveLength(2)
      expect(top2[0].getFitness()?.score).toBe(0.9)
      expect(top2[1].getFitness()?.score).toBe(0.7)
    })

    it("should throw error for empty population", () => {
      population.clear()

      expect(() => population.getBest()).toThrow("Population is empty")
      expect(() => population.getWorst()).toThrow("Population is empty")
    })
  })

  describe("Statistics", () => {
    it("should calculate population stats", () => {
      // fails because: expected +0 to be 1 - stats.generation returns 0 instead of expected 1
      const mockGenomes = [
        {
          getWorkflowVersionId: () => "genome1",
          getFitness: () => ({ score: 0.8 }),
          getFitnessScore: () => 0.8,
        },
        {
          getWorkflowVersionId: () => "genome2",
          getFitness: () => ({ score: 0.6 }),
          getFitnessScore: () => 0.6,
        },
      ] as any[]

      population.setPopulation(mockGenomes)
      const stats = population.getStats()

      expect(stats.generation).toBe(1)
      expect(stats.bestFitness).toBe(0.8)
      expect(stats.avgFitness).toBe(0.6)
    })

    it("should throw error for empty population stats", () => {
      expect(() => population.getStats()).toThrow("Population is empty")
    })
  })

  describe("Genome Management", () => {
    it("should add genome", () => {
      const mockGenome = { getWorkflowVersionId: () => "new-genome" } as any

      population.addGenome(mockGenome)

      expect(population.size()).toBe(1)
      expect(population.getGenomes()).toContain(mockGenome)
    })

    it("should remove genome by id", () => {
      const mockGenome = {
        getWorkflowVersionId: () => "remove-me",
      } as any
      population.addGenome(mockGenome)

      const removed = population.removeGenome("remove-me")

      expect(removed).toBe(true)
      expect(population.size()).toBe(0)
    })

    it("should return false for non-existent genome removal", () => {
      const removed = population.removeGenome("non-existent")

      expect(removed).toBe(false)
    })

    it("should clear population", () => {
      // fails because: expected 'test-generation-id' to be +0 - clear() doesn't reset generationId properly
      const mockGenome = { getWorkflowVersionId: () => "test" } as any
      population.addGenome(mockGenome)

      population.clear()

      expect(population.size()).toBe(0)
      expect(population.getGenerationId()).toBe(0)
    })
  })

  describe("Edge Cases", () => {
    it("should handle zero population size", () => {
      const zeroConfig = { ...config, populationSize: 0 }
      const zeroPopulation = new Population(zeroConfig, mockRunService)

      expect(zeroPopulation.size()).toBe(0)
    })

    it("should handle single genome", () => {
      // fails because: expected undefined to be mockGenome - getBest/getWorst return undefined for single genome
      const mockGenome = {
        getWorkflowVersionId: () => "single",
        getFitness: () => ({ score: 0.5 }),
        getFitnessScore: () => 0.5,
      } as any

      population.addGenome(mockGenome)

      expect(population.getBest()).toBe(mockGenome)
      expect(population.getWorst()).toBe(mockGenome)
    })
  })
})
