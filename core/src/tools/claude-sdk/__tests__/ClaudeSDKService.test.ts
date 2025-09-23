import { describe, it, expect, vi, beforeEach } from "vitest"
import { ClaudeSDKService } from "../ClaudeSDKService"

// Create mocks for the query builder
const mockQuery = {
  asText: vi.fn().mockResolvedValue("Test response from SDK"),
  getUsage: vi.fn().mockResolvedValue({
    totalTokens: 100,
    totalCost: 0.01,
    inputTokens: 50,
    outputTokens: 50,
  }),
}

const mockQueryBuilder = {
  withModel: vi.fn().mockReturnThis(),
  allowTools: vi.fn().mockReturnThis(),
  skipPermissions: vi.fn().mockReturnThis(),
  withTimeout: vi.fn().mockReturnThis(),
  query: vi.fn(() => mockQuery),
}

// Mock the Claude SDK
vi.mock("@instantlyeasy/claude-code-sdk-ts", () => ({
  claude: vi.fn(() => mockQueryBuilder),
}))

describe("ClaudeSDKService", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should execute a basic request successfully", async () => {
    const result = await ClaudeSDKService.execute(
      "test-node",
      "Test prompt",
      { model: "sonnet" },
      "test-invocation"
    )

    expect(result).toBeDefined()
    expect(result.response.type).toBe("text")
    if (result.response.type === "text") {
      expect(result.response.content).toBe("Test response from SDK")
    }
    expect(result.cost).toBe(0.01)
    expect(result.agentSteps).toHaveLength(1)
    expect(result.agentSteps[0]).toEqual({
      type: "text",
      return: "Test response from SDK",
    })
  })

  it("should handle SDK errors gracefully", async () => {
    // Mock an error for this specific test
    const { claude } = await import("@instantlyeasy/claude-code-sdk-ts")
    ;(claude as any).mockImplementationOnce(() => {
      throw new Error("SDK connection failed")
    })

    const result = await ClaudeSDKService.execute("test-node", "Test prompt")

    expect(result.response.type).toBe("error")
    if (result.response.type === "error") {
      expect(result.response.message).toContain("SDK connection failed")
    }
    expect(result.cost).toBe(0)
    expect(result.agentSteps[0].type).toBe("error")
  })

  it("should pass configuration correctly", async () => {
    await ClaudeSDKService.execute("test-node", "Test prompt", {
      model: "opus",
      allowedTools: ["Read", "Write"],
      skipPermissions: true,
      timeout: 60000,
    })

    expect(mockQueryBuilder.withModel).toHaveBeenCalledWith("opus")
    expect(mockQueryBuilder.allowTools).toHaveBeenCalledWith("Read", "Write")
    expect(mockQueryBuilder.skipPermissions).toHaveBeenCalled()
    expect(mockQueryBuilder.withTimeout).toHaveBeenCalledWith(60000)
  })
})
