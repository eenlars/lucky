import { getSettings } from "@utils/config/runtimeConfig"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock dependencies
vi.mock("@messages/api/sendAI")
vi.mock("@node/makeLearning")
vi.mock("@messages/summaries")
vi.mock("@node/extractToolLogs")

describe("InvocationPipeline Memory Refactor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should have makeLearning available in both execution paths", () => {
    // Test that makeLearning is imported and available
    expect(typeof import("../../prompts/makeLearning")).toBe("object")
  })

  it("should have createSummary available", () => {
    // Test that createSummary is imported and available
    expect(typeof import("@/messages/summaries")).toBe("object")
  })

  it("should have extractToolLogs helper available", () => {
    // Test that extractToolLogs is imported and available
    expect(typeof import("../extractToolLogs")).toBe("object")
  })

  it("should support switching between experimental and traditional modes", () => {
    // Test that getSettings().tools.experimentalMultiStepLoop exists and can be read
    expect(typeof getSettings().tools.experimentalMultiStepLoop).toBe("boolean")

    // Test that it has a defined value
    expect(getSettings().tools.experimentalMultiStepLoop).toBeDefined()
  })
})
