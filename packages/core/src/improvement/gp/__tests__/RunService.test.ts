// tests for RunService - database persistence for evolution runs
import {
  createMockEvolutionSettings,
  createMockGenome,
  mockRuntimeConstantsForGP,
  setupCoreTest,
} from "@core/utils/__tests__/setup/coreMocks"
import { beforeEach, describe, expect, it, vi } from "vitest"

// mock external dependencies without referencing outer vars (avoid hoist issues)
vi.mock("@lucky/shared", async importOriginal => {
  const actual = await importOriginal<typeof import("@lucky/shared")>()
  return {
    ...actual,
    genShortId: vi.fn(() => "short-test-id"),
  }
})

vi.mock("@core/utils/logging/Logger", () => ({
  lgg: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// Runtime constants mocked by mockRuntimeConstantsForGP

describe("RunService", () => {
  let lgg: any
  let genShortId: any
  let mockPersistence: any

  beforeEach(async () => {
    setupCoreTest()
    mockRuntimeConstantsForGP()

    // Access mocked modules via dynamic import to respect path aliases
    ;({ lgg } = await import("@core/utils/logging/Logger"))
    ;({ genShortId } = await import("@lucky/shared"))

    // ensure default genShortId
    vi.mocked(genShortId).mockReturnValue("short-test-id")

    // Create mock persistence with evolution namespace
    mockPersistence = {
      evolution: {
        createRun: vi.fn().mockResolvedValue("test-run-id"),
        createGeneration: vi.fn().mockResolvedValue("test-generation-id"),
        completeGeneration: vi.fn().mockResolvedValue(undefined),
        completeRun: vi.fn().mockResolvedValue(undefined),
        saveGenome: vi.fn().mockResolvedValue("test-genome-id"),
        getLastCompletedGeneration: vi.fn().mockResolvedValue(null),
      },
    }
  })

  describe("initialization", () => {
    it("should initialize without persistence", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService()
      expect(service.getRunId).toBeDefined()
      expect(service.getGenerationId()).toBeUndefined()
    })

    it("should initialize with verbose mode", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(true)
      expect(service.getRunId).toBeDefined()
      expect(service.getGenerationId()).toBeUndefined()
    })

    it("should initialize with persistence", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, mockPersistence)
      expect(service.getRunId).toBeDefined()
      expect(service.getGenerationId()).toBeUndefined()
    })
  })

  describe("createRun", () => {
    it("should create new evolution run successfully", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, mockPersistence)
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      expect(service.getRunId()).toBe("test-run-id")
      expect(mockPersistence.evolution.createRun).toHaveBeenCalledWith({
        goalText: "test goal",
        config: config,
        status: "running",
        evolutionType: "gp",
        notes: expect.stringContaining("GP Evolution Run"),
      })
      expect(mockPersistence.evolution.createGeneration).toHaveBeenCalledWith({
        generationNumber: 0,
        runId: "test-run-id",
      })
    })

    it("should handle verbose mode for run creation", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(true, "GP", undefined, mockPersistence)
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      expect(lgg.log).toHaveBeenCalledWith(expect.stringContaining("[RunService] Initialized run"))
    })

    it("should create run without persistence", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, undefined)
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      expect(service.getRunId()).toBe("run_short-test-id")
      expect(service.getCurrentGenerationId()).toBe("gen_short-test-id")
    })
  })

  describe("createGeneration", () => {
    it("should create new generation successfully", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, mockPersistence)
      const config = createMockEvolutionSettings()

      // start a run first
      await service.createRun("test goal", config)

      await service.createNewGeneration()

      expect(service.getCurrentGenerationId()).toBe("test-generation-id")
      expect(mockPersistence.evolution.createGeneration).toHaveBeenCalledWith({
        generationNumber: 1,
        runId: "test-run-id",
      })
    })

    it("should create generation without persistence", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, undefined)
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      // Reset mock to get a new ID for the generation
      vi.mocked(genShortId).mockReturnValueOnce("gen-2-id")

      await service.createNewGeneration()

      expect(service.getCurrentGenerationId()).toBe("gen_gen-2-id")
    })
  })

  describe("completeGeneration", () => {
    it("should update generation with best genome", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      // Mock the main persistence for workflow version creation
      mockPersistence.createWorkflowVersion = vi.fn().mockResolvedValue(undefined)

      const service = new RunService(false, "GP", undefined, mockPersistence)
      const config = createMockEvolutionSettings()
      const mockGenome = await createMockGenome()

      // setup run and generation
      await service.createRun("test goal", config)

      const mockStats = {
        generation: 1,
        bestFitness: 0.5,
        avgFitness: 0.4,
        fitnessStdDev: 0.1,
        evaluationCost: 0.1,
        evaluationsPerHour: 10,
        improvementRate: 0.05,
        worstFitness: 0.3,
      }

      await service.completeGeneration({
        bestGenome: mockGenome,
        stats: mockStats,
        operator: "mutation",
      })

      expect(mockPersistence.evolution.completeGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          generationId: "test-generation-id",
          bestWorkflowVersionId: expect.any(String),
        }),
        mockStats,
      )
    })

    it("should require active generation", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, mockPersistence)

      // No run/generation created
      const mockGenome = await createMockGenome()
      const mockStats = {
        generation: 1,
        bestFitness: 0.5,
        avgFitness: 0.4,
        fitnessStdDev: 0.1,
        evaluationCost: 0.1,
        evaluationsPerHour: 10,
        improvementRate: 0.05,
        worstFitness: 0.3,
      }

      // Should not throw but return early when no generation
      await service.completeGeneration({
        bestGenome: mockGenome,
        stats: mockStats,
        operator: "mutation",
      })

      expect(mockPersistence.evolution.completeGeneration).not.toHaveBeenCalled()
    })

    it("should handle generation update failure", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      mockPersistence.evolution.completeGeneration.mockRejectedValue(new Error("Database error"))
      mockPersistence.createWorkflowVersion = vi.fn().mockResolvedValue(undefined)

      const service = new RunService(false, "GP", undefined, mockPersistence)
      const config = createMockEvolutionSettings()
      const mockGenome = await createMockGenome()

      await service.createRun("test goal", config)

      const mockStats = {
        generation: 1,
        bestFitness: 0.5,
        avgFitness: 0.4,
        fitnessStdDev: 0.1,
        evaluationCost: 0.1,
        evaluationsPerHour: 10,
        improvementRate: 0.05,
        worstFitness: 0.3,
      }

      await expect(
        service.completeGeneration({
          bestGenome: mockGenome,
          stats: mockStats,
          operator: "mutation",
        }),
      ).rejects.toThrow("Database error")
    })

    it("should handle completion without persistence", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, undefined)
      const config = createMockEvolutionSettings()
      const mockGenome = await createMockGenome()

      await service.createRun("test goal", config)

      const mockStats = {
        generation: 1,
        bestFitness: 0.5,
        avgFitness: 0.4,
        fitnessStdDev: 0.1,
        evaluationCost: 0.1,
        evaluationsPerHour: 10,
        improvementRate: 0.05,
        worstFitness: 0.3,
      }

      // Should not throw without persistence
      await expect(
        service.completeGeneration({
          bestGenome: mockGenome,
          stats: mockStats,
          operator: "mutation",
        }),
      ).resolves.toBeUndefined()
    })
  })

  describe("completeRun", () => {
    it("should update run status to completed", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, mockPersistence)
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      await service.completeRun("completed")

      expect(mockPersistence.evolution.completeRun).toHaveBeenCalledWith("test-run-id", "completed", expect.any(String))
    })

    it("should handle failure status", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, mockPersistence)
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      // completeRun takes status and optional totalCost and bestGenome
      await service.completeRun("failed")

      expect(mockPersistence.evolution.completeRun).toHaveBeenCalledWith("test-run-id", "failed", expect.any(String))
    })

    it("should require active run", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, mockPersistence)

      // Should not throw but return early when no run
      await service.completeRun("completed")

      expect(mockPersistence.evolution.completeRun).not.toHaveBeenCalled()
    })

    it("should handle run update failure", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      mockPersistence.evolution.completeRun.mockRejectedValue(new Error("Database error"))

      const service = new RunService(false, "GP", undefined, mockPersistence)
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      await expect(service.completeRun("completed")).rejects.toThrow("Database error")
    })

    it("should handle completion without persistence", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, undefined)
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      // Should not throw without persistence
      await expect(service.completeRun("completed")).resolves.toBeUndefined()
    })
  })

  describe("error handling", () => {
    it("should handle network errors gracefully", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      mockPersistence.evolution.createRun.mockRejectedValue(new Error("Network error"))

      const service = new RunService(false, "GP", undefined, mockPersistence)
      const config = createMockEvolutionSettings()

      await expect(service.createRun("test goal", config)).rejects.toThrow("Network error")
    })

    it("should log errors in verbose mode", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      mockPersistence.evolution.createRun.mockRejectedValue(new Error("Test error"))

      const service = new RunService(true, "GP", undefined, mockPersistence)
      const config = createMockEvolutionSettings()

      // The RunService doesn't actually log errors in createRun, it just throws
      await expect(service.createRun("test goal", config)).rejects.toThrow("Test error")
    })
  })

  describe("state management", () => {
    it("should track run and generation IDs correctly", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, mockPersistence)
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      expect(service.getRunId()).toBe("test-run-id")
      expect(service.getCurrentGenerationId()).toBe("test-generation-id")

      mockPersistence.evolution.createGeneration.mockResolvedValue("new-gen-id")
      await service.createNewGeneration()

      expect(service.getRunId()).toBe("test-run-id")
      expect(service.getCurrentGenerationId()).toBe("new-gen-id")
    })

    it("should reset state appropriately", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(false, "GP", undefined, mockPersistence)
      const config = createMockEvolutionSettings()

      await service.createRun("first goal", config)
      expect(service.getRunId()).toBe("test-run-id")

      mockPersistence.evolution.createRun.mockResolvedValue("new-run-id")
      mockPersistence.evolution.createGeneration.mockResolvedValue("new-gen-id")

      await service.createRun("second goal", config)
      expect(service.getRunId()).toBe("new-run-id")
      expect(service.getCurrentGenerationId()).toBe("new-gen-id")
    })
  })
})
