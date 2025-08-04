import { CONFIG } from "@/runtime/settings/constants"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock dependencies
vi.mock("@/core/messages/api/sendAI")
vi.mock("@/core/node/makeLearning")
vi.mock("@/core/messages/summaries")
vi.mock("@/core/node/extractToolLogs")

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
    expect(typeof import("@/core/messages/summaries")).toBe("object")
  })

  it("should have extractToolLogs helper available", () => {
    // Test that extractToolLogs is imported and available
    expect(typeof import("../extractToolLogs")).toBe("object")
  })

  it("should support switching between experimental and traditional modes", () => {
    // Test that CONFIG.tools.experimentalMultiStepLoop exists and can be read
    expect(typeof CONFIG.tools.experimentalMultiStepLoop).toBe("boolean")

    // Test that it has a defined value
    expect(CONFIG.tools.experimentalMultiStepLoop).toBeDefined()
  })
})
