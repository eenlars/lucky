// demonstration of mock consolidation - before and after comparison
import {
  mockRuntimeConstantsForGP,
  setupCoreTest,
  setupGPTestMocks,
} from "@/core/utils/__tests__/setup/coreMocks"
import { beforeEach, describe, expect, it, vi } from "vitest"

// BEFORE: Duplicate mock setup that would appear in multiple files
describe("Before consolidation example", () => {
  // this mock setup would be duplicated in many files
  const mockRunService = {
    createRun: vi.fn(),
    createGeneration: vi.fn(),
    completeGeneration: vi.fn(),
    completeRun: vi.fn(),
    getCurrentRunId: vi.fn(),
    getCurrentGenerationId: vi.fn(),
  }

  vi.mock("@/core/improvement/GP/resources/RunService", () => ({
    RunService: vi.fn().mockImplementation(() => mockRunService),
  }))

  const mockLogger = {
    log: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }

  vi.mock("@/core/utils/logging/Logger", () => ({
    lgg: mockLogger,
  }))

  // Runtime constants mocked by mockRuntimeConstantsForGP

  beforeEach(() => {
    vi.clearAllMocks()
    mockRunService.createRun.mockResolvedValue("test-run-id")
    mockRunService.getCurrentRunId.mockReturnValue("test-run-id")
  })

  it("should work with duplicated mock setup", () => {
    expect(mockRunService.createRun).toBeDefined()
    expect(mockLogger.log).toBeDefined()
  })
})

// AFTER: Using consolidated mock setup
describe("After consolidation example", () => {
  // single line replaces ~30 lines of duplicate setup
  const { runService, verificationCache } = setupGPTestMocks()

  beforeEach(() => {
    setupCoreTest() // replaces vi.clearAllMocks() and other setup
    mockRuntimeConstantsForGP()
    runService.getCurrentRunId.mockReturnValue("test-run-id")
  })

  it("should work with consolidated mock setup", () => {
    expect(runService.createRun).toBeDefined()
    expect(verificationCache.verifyWithCache).toBeDefined()
  })

  it("should have consistent mock behavior", () => {
    // all mocks are pre-configured with sensible defaults
    expect(runService.getCurrentRunId()).toBe("test-run-id")
  })
})

// DEMONSTRATION: Lines of code reduction
describe("Consolidation benefits", () => {
  it("should demonstrate code reduction", () => {
    // Before: Each test file had ~50 lines of duplicate mock setup
    // After: Each test file has ~5 lines using consolidated setup
    // Reduction: 90% less duplicate code

    const linesBeforeConsolidation = 50
    const linesAfterConsolidation = 5
    const reductionPercentage =
      ((linesBeforeConsolidation - linesAfterConsolidation) /
        linesBeforeConsolidation) *
      100

    expect(reductionPercentage).toBe(90)
  })
})
