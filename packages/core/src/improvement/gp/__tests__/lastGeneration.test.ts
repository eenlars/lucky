import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock external dependencies
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

describe("getLastCompletedGeneration", () => {
  let mockPersistence: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock persistence with evolution namespace
    mockPersistence = {
      evolution: {
        getLastCompletedGeneration: vi.fn(),
      },
    }
  })

  it("should return the last completed generation number if exists", async () => {
    const mockResult = {
      runId: "test-run-id",
      generationNumber: 5,
      generationId: "test-generation-id",
    }

    mockPersistence.evolution.getLastCompletedGeneration.mockResolvedValue(mockResult)

    const { RunService } = await import("@core/improvement/gp/RunService")
    const service = new RunService(false, "GP", undefined, mockPersistence)

    const result = await service.getLastCompletedGeneration("test-run-id")

    expect(result).toEqual(mockResult)
    expect(mockPersistence.evolution.getLastCompletedGeneration).toHaveBeenCalledWith("test-run-id")
  })

  it("should return null if no completed generations exist", async () => {
    mockPersistence.evolution.getLastCompletedGeneration.mockResolvedValue(null)

    const { RunService } = await import("@core/improvement/gp/RunService")
    const service = new RunService(false, "GP", undefined, mockPersistence)

    const result = await service.getLastCompletedGeneration("test-run-id")

    expect(result).toBeNull()
  })

  it("should throw on database errors", async () => {
    const dbError = new Error("Database connection failed")
    mockPersistence.evolution.getLastCompletedGeneration.mockRejectedValue(dbError)

    const { RunService } = await import("@core/improvement/gp/RunService")
    const service = new RunService(false, "GP", undefined, mockPersistence)

    await expect(service.getLastCompletedGeneration("test-run-id")).rejects.toThrow("Database connection failed")
  })

  it("should return null when no persistence is available", async () => {
    const { RunService } = await import("@core/improvement/gp/RunService")
    const service = new RunService(false, "GP", undefined, undefined)

    const result = await service.getLastCompletedGeneration("test-run-id")

    expect(result).toBeNull()
  })

  it("should warn and return null when no run ID provided", async () => {
    const { lgg } = await import("@core/utils/logging/Logger")

    const { RunService } = await import("@core/improvement/gp/RunService")
    const service = new RunService(false, "GP", undefined, mockPersistence)

    const result = await service.getLastCompletedGeneration("")

    expect(result).toBeNull()
    expect(lgg.warn).toHaveBeenCalledWith(
      "[RunService] No active run ID available for last completed generation lookup",
    )
  })
})
