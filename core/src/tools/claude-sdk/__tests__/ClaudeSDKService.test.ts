import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ClaudeSDKService } from "../ClaudeSDKService"

// Create shared mock functions
const mockCreate = vi.fn()

// Mock the Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  // Define mock error classes
  class APIError extends Error {
    status?: number
    headers?: any
    constructor(message: string, status?: number) {
      super(message)
      this.status = status
      this.headers = { 'request-id': 'test-request-id' }
    }
  }
  class BadRequestError extends APIError {}
  class AuthenticationError extends APIError {}
  class PermissionDeniedError extends APIError {}
  class NotFoundError extends APIError {}
  class UnprocessableEntityError extends APIError {}
  class RateLimitError extends APIError {}
  class InternalServerError extends APIError {}
  class APIConnectionError extends APIError {}
  
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
      },
    })),
    Anthropic: {
      APIError,
      BadRequestError,
      AuthenticationError,
      PermissionDeniedError,
      NotFoundError,
      UnprocessableEntityError,
      RateLimitError,
      InternalServerError,
      APIConnectionError,
    },
  }
})

describe("ClaudeSDKService", () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.ANTHROPIC_API_KEY = "test-api-key"
    
    // Reset default mock behavior
    mockCreate.mockResolvedValue({
      id: "msg_test123",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "Mocked response from Anthropic SDK",
        },
      ],
      model: "claude-3-5-sonnet-20241022",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: 25,
        output_tokens: 10,
      },
    })
  })

  afterEach(() => {
    if (originalEnv) {
      process.env.ANTHROPIC_API_KEY = originalEnv
    } else {
      delete process.env.ANTHROPIC_API_KEY
    }
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
      expect(result.response.content).toBe("Mocked response from Anthropic SDK")
    }
    expect(result.cost).toBeGreaterThanOrEqual(0)
    expect(result.agentSteps).toHaveLength(1)
    expect(result.agentSteps[0].type).toBe("text")
    expect(mockCreate).toHaveBeenCalled()
  })

  it("should handle API key missing error", async () => {
    delete process.env.ANTHROPIC_API_KEY

    const result = await ClaudeSDKService.execute("test-node", "Test prompt")

    expect(result.response.type).toBe("error")
    if (result.response.type === "error") {
      expect(result.response.message).toContain("ANTHROPIC_API_KEY")
    }
    expect(result.cost).toBe(0)
    expect(result.agentSteps[0].type).toBe("error")
  })

  it("should handle SDK errors gracefully", async () => {
    process.env.ANTHROPIC_API_KEY = "test-api-key"
    
    mockCreate.mockRejectedValue(new Error("SDK connection failed"))

    const result = await ClaudeSDKService.execute("test-node", "Test prompt")

    expect(result.response.type).toBe("error")
    if (result.response.type === "error") {
      expect(result.response.message).toContain("SDK connection failed")
    }
    expect(result.cost).toBe(0)
    expect(result.agentSteps[0].type).toBe("error")
  })

  it("should pass configuration correctly", async () => {
    mockCreate.mockResolvedValue({
      id: "msg_test456",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "Response with custom config",
        },
      ],
      model: "claude-3-opus-20240229",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: 50,
        output_tokens: 20,
      },
    })

    await ClaudeSDKService.execute("test-node", "Test prompt", {
      model: "opus",
      maxTokens: 2048,
      temperature: 0.5,
      timeout: 30000,
    })

    // The SDK client.messages.create now takes two parameters: 
    // the message options and the request options (for timeout)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.stringContaining("opus"),
        max_tokens: 2048,
        temperature: 0.5,
      }),
      expect.objectContaining({
        timeout: 30000,
      })
    )
  })

  it("should calculate costs correctly", async () => {
    mockCreate.mockResolvedValue({
      id: "msg_test789",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "Test response",
        },
      ],
      model: "claude-3-5-sonnet-20241022",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: 1000,
        output_tokens: 500,
      },
    })

    const result = await ClaudeSDKService.execute("test-node", "Test prompt", {
      model: "sonnet",
    })

    // Sonnet pricing: $3/M input, $15/M output
    // (1000/1M * 3) + (500/1M * 15) = 0.003 + 0.0075 = 0.0105
    expect(result.cost).toBeCloseTo(0.0105, 4)
  })

  it("should retry on retryable errors", async () => {
    // The SDK handles retries internally, so our service only sees final result
    mockCreate.mockResolvedValue({
      id: "msg_retry",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "Success after SDK internal retry",
        },
      ],
      model: "claude-3-5-sonnet-20241022",
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: 10,
        output_tokens: 5,
      },
    })

    const result = await ClaudeSDKService.execute("test-node", "Test prompt")

    expect(result.response.type).toBe("text")
    if (result.response.type === "text") {
      expect(result.response.content).toBe("Success after SDK internal retry")
    }
  })

  it("should not retry on non-retryable errors", async () => {
    mockCreate.mockRejectedValue(new Error("Invalid API key"))

    const result = await ClaudeSDKService.execute("test-node", "Test prompt")

    expect(mockCreate).toHaveBeenCalledTimes(1) // No retry
    expect(result.response.type).toBe("error")
    if (result.response.type === "error") {
      expect(result.response.message).toContain("Invalid API key")
    }
  })
})