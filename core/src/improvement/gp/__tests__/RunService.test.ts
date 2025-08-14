// tests for RunService - database persistence for evolution runs
import {
  createMockEvolutionSettings,
  createMockGenome,
  mockRuntimeConstantsForGP,
  setupCoreTest,
} from "@core/utils/__tests__/setup/coreMocks"
import { beforeEach, describe, expect, it, vi } from "vitest"

// mock external dependencies without referencing outer vars (avoid hoist issues)
vi.mock("@core/utils/clients/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
  },
}))

vi.mock("@core/utils/common/utils", () => ({
  genShortId: vi.fn(() => "short-test-id"),
}))

vi.mock("@core/utils/logging/Logger", () => ({
  lgg: {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// Runtime constants mocked by mockRuntimeConstantsForGP

describe("RunService", () => {
  // Use broad types to avoid mismatches with the real module types at compile time.
  // The actual values are mocked at runtime by vi.mock above.
  let supabase: any
  let lgg: any
  let genShortId: any
  // TODO: missing test coverage for:
  // - concurrent operations or race conditions
  // - validating exact structure of data sent to database
  // - integration tests with real database interactions
  // - performance tests for large-scale operations
  beforeEach(async () => {
    setupCoreTest()
    mockRuntimeConstantsForGP()

    // Access mocked modules via dynamic import to respect path aliases
    ;({ supabase } = await import("@core/utils/clients/supabase/client"))
    ;({ lgg } = await import("@core/utils/logging/Logger"))
    ;({ genShortId } = await import("@core/utils/common/utils"))

    // ensure default genShortId
    vi.mocked(genShortId).mockReturnValue("short-test-id")

    // Create separate mock chains for different tables
    const mockEvolutionRunChain = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { run_id: "test-run-id" },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    }

    const mockGenerationChain = {
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { generation_id: "test-generation-id" },
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          error: null,
        }),
      }),
    }

    const mockWorkflowVersionChain = {
      insert: vi.fn().mockResolvedValue({
        error: null,
      }),
      upsert: vi.fn().mockResolvedValue({
        error: null,
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }

    // Mock the from method to return appropriate chain based on table
    ;(supabase.from as any).mockImplementation((table: string) => {
      if (table === "EvolutionRun") return mockEvolutionRunChain
      if (table === "Generation") return mockGenerationChain
      if (table === "WorkflowVersion" || table === "Workflow")
        return mockWorkflowVersionChain
      return mockEvolutionRunChain // default
    })
  })

  describe("constructor", () => {
    it("should initialize with default verbose false", async () => {
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
  })

  describe("createRun", () => {
    it("should create new evolution run successfully", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService()
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)
      // after createRun(), runId should be retrievable
      expect(service.getRunId()).toBe("test-run-id")
      expect(supabase.from).toHaveBeenCalledWith("EvolutionRun")
    })

    it("should handle verbose mode for run creation", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService(true)
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      expect(lgg.log).toHaveBeenCalled()
    })
  })

  describe("createGeneration", () => {
    it("should create new generation successfully", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService()
      const config = createMockEvolutionSettings()

      // start a run first
      await service.createRun("test goal", config)

      await service.createNewGeneration()

      expect(service.getCurrentGenerationId()).toBe("test-generation-id")
      expect(supabase.from).toHaveBeenCalledWith("Generation")
    })
  })

  describe("completeGeneration", () => {
    it("should update generation with best genome", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService()
      const config = createMockEvolutionSettings()
      const mockGenome = await createMockGenome()

      // setup run and generation
      await service.createRun("test goal", config)
      await service.createNewGeneration()

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

      expect(supabase.from).toHaveBeenCalledWith("Generation")
      expect(supabase.from).toHaveBeenCalledWith("WorkflowVersion")
    })

    it("should require active generation", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService()
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

      // completeGeneration should return early if no active generation
      await service.completeGeneration({
        bestGenome: mockGenome,
        stats: mockStats,
        operator: "mutation",
      })

      // TODO: assertion only checks if warn was called, not what was warned about
      // should verify the specific warning message
      // should not call supabase methods without active generation
      expect(lgg.warn).toHaveBeenCalled()
    })

    it("should handle generation update failure", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService()
      const config = createMockEvolutionSettings()
      const mockGenome = await createMockGenome()

      await service.createRun("test goal", config)
      await service.createNewGeneration()

      // mock the update to fail
      const mockGenerationChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: "update failed" },
          }),
        }),
      }

      ;(supabase.from as any).mockImplementation((table: string) => {
        if (table === "Generation") return mockGenerationChain
        return { upsert: vi.fn().mockResolvedValue({ error: null }) }
      })

      await expect(
        service.completeGeneration({
          bestGenome: mockGenome,
          // TODO: test passes undefined for stats but doesn't validate how code handles this
          stats: undefined,
          operator: "mutation",
        })
      ).rejects.toThrow()
    })
  })

  describe("completeRun", () => {
    it("should update run status to completed", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService()
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      await service.completeRun("completed", 1.5)

      expect(supabase.from).toHaveBeenCalledWith("EvolutionRun")
    })

    it("should handle failure status", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService()
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      await service.completeRun("failed", 0.5)
      expect(supabase.from).toHaveBeenCalledWith("EvolutionRun")
    })

    it("should require active run", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService()

      // completeRun should return early if no active run
      await service.completeRun("completed", 1.0)

      // TODO: assertion only checks if warn was called, not the warning content
      // should verify exact warning message about missing active run
      // should not call supabase methods without active run
      expect(lgg.warn).toHaveBeenCalled()
    })

    it("should handle run update failure", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService()
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)

      // mock the update to fail
      const mockEvolutionRunChain = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: "update failed" },
          }),
        }),
      }

      ;(supabase.from as any).mockImplementation((table: string) => {
        if (table === "EvolutionRun") return mockEvolutionRunChain
        return { upsert: vi.fn().mockResolvedValue({ error: null }) }
      })

      await expect(service.completeRun("completed", 1.0)).rejects.toThrow()
    })
  })

  describe("error handling", () => {
    it("should handle network errors gracefully", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      // mock the insert to throw an error
      const mockEvolutionRunChain = {
        insert: vi.fn().mockImplementation(() => {
          throw new Error("network error")
        }),
      }

      ;(supabase.from as any).mockImplementation((table: string) => {
        if (table === "EvolutionRun") return mockEvolutionRunChain
        return { upsert: vi.fn().mockResolvedValue({ error: null }) }
      })

      const service = new RunService()
      const config = createMockEvolutionSettings()

      await expect(service.createRun("test goal", config)).rejects.toThrow(
        "network error"
      )
    })

    it("should log errors in verbose mode", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      // mock the insert to return an error
      const mockEvolutionRunChain = {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "test error" },
            }),
          }),
        }),
      }

      vi.mocked(supabase.from).mockImplementation((table: string) => {
        if (table === "EvolutionRun") return mockEvolutionRunChain
        return { upsert: vi.fn().mockResolvedValue({ error: null }) }
      })

      const service = new RunService(true)
      const config = createMockEvolutionSettings()

      await expect(service.createRun("test goal", config)).rejects.toThrow()
      expect(lgg.error).toHaveBeenCalled()
    })
  })

  describe("state management", () => {
    it("should track run and generation IDs correctly", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService()
      const config = createMockEvolutionSettings()

      expect(service.getGenerationId()).toBeUndefined()

      await service.createRun("test goal", config)
      expect(service.getRunId()).toBe("test-run-id")

      await service.createNewGeneration()
      expect(service.getCurrentGenerationId()).toBe("test-generation-id")
    })

    it("should reset state appropriately", async () => {
      const { RunService } = await import("@core/improvement/gp/RunService")

      const service = new RunService()
      const config = createMockEvolutionSettings()

      await service.createRun("test goal", config)
      expect(service.getRunId()).toBe("test-run-id")

      await service.completeRun("completed", 1.0)

      // state should persist after end for reference
      expect(service.getRunId()).toBe("test-run-id")
    })
  })
})
