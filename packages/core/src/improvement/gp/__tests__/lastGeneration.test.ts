import { beforeEach, describe, expect, it, vi } from "vitest"

// Create mock instances directly
const mockSupabaseChain = {
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

const mockSupabaseClient = {
  from: vi.fn().mockReturnValue(mockSupabaseChain),
}

const mockGenShortId = vi.fn()
const mockLggLog = vi.fn()
const mockLggError = vi.fn()
const mockLggWarn = vi.fn()

// Mock external dependencies
vi.mock("@utils/clients/supabase/client", () => ({
  supabase: mockSupabaseClient,
}))

vi.mock("@utils/common/utils", () => ({
  genShortId: mockGenShortId,
}))

vi.mock("@utils/logging/Logger", () => ({
  lgg: {
    log: mockLggLog,
    error: mockLggError,
    warn: mockLggWarn,
  },
}))

describe("getLastCompletedGeneration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return the last completed generation number if exists", async () => {
    // Setup mock to return generation number 5
    mockSupabaseChain.single.mockResolvedValue({
      data: { number: 5, generation_id: "test-generation-id" },
      error: null,
    })

    const { RunService } = await import("@improvement/gp/RunService")
    const service = new RunService()

    const result = await service.getLastCompletedGeneration("test-run-id")

    expect(result).toEqual({
      runId: "test-run-id",
      generationNumber: 5,
      generationId: "test-generation-id",
    })
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("Generation")
    expect(mockSupabaseChain.select).toHaveBeenCalledWith(
      "number, generation_id"
    )
    expect(mockSupabaseChain.eq).toHaveBeenCalledWith("run_id", "test-run-id")
    expect(mockSupabaseChain.not).toHaveBeenCalledWith("end_time", "is", null)
    expect(mockSupabaseChain.order).toHaveBeenCalledWith("number", {
      ascending: false,
    })
    expect(mockSupabaseChain.limit).toHaveBeenCalledWith(1)
  })

  it("should return null if no completed generations exist", async () => {
    // Setup mock to return PGRST116 error (no records found)
    mockSupabaseChain.single.mockResolvedValue({
      data: null,
      error: { code: "PGRST116" },
    })

    const { RunService } = await import("@improvement/gp/RunService")
    const service = new RunService()
    // service.setRunId("test-run-id") -> old way

    const result = await service.getLastCompletedGeneration("test-run-id")

    expect(result).toBeNull()
  })

  it("should throw on database errors", async () => {
    // Setup mock to return a database error
    const dbError = { code: "DATABASE_ERROR", message: "Connection failed" }
    mockSupabaseChain.single.mockResolvedValue({
      data: null,
      error: dbError,
    })

    const { RunService } = await import("@improvement/gp/RunService")
    const service = new RunService()
    // service.setRunId("test-run-id") -> old way

    await expect(
      service.getLastCompletedGeneration("test-run-id")
    ).rejects.toEqual(dbError)
    expect(mockLggError).toHaveBeenCalled()
  })

  it("should handle data.number being null", async () => {
    // Setup mock to return data with null number
    mockSupabaseChain.single.mockResolvedValue({
      data: { number: null },
      error: null,
    })

    const { RunService } = await import("@improvement/gp/RunService")
    const service = new RunService()
    // service.setRunId("test-run-id") -> old way

    const result = await service.getLastCompletedGeneration("test-run-id")

    expect(result).toBeNull()
  })
})
