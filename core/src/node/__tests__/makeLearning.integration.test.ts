import type { TResponse } from "@core/messages/api/sendAI"
import { MODELS } from "@runtime/settings/constants"
import { describe, expect, it, vi } from "vitest"
import { makeLearning } from "../../prompts/makeLearning"

// Mock the sendAI function
vi.mock("@core/messages/api/sendAI", () => ({
  sendAI: vi.fn(),
}))

describe("makeLearning Integration Test", () => {
  it("should handle AI response that returns memory directly (not wrapped)", async () => {
    const { sendAI } = await import("@core/messages/api/sendAI")

    // Mock AI response that returns memory directly (the format AI naturally uses)
    const mockResponse: TResponse<{ text: string }> = {
      success: true,
      data: {
        text: "common_sense:some companies have physical store locations:1",
      },
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: [],
    }

    vi.mocked(sendAI).mockResolvedValue(mockResponse)

    const result = await makeLearning({
      toolLogs: "text: Rituals has physical stores",
      nodeSystemPrompt: "check if this company has physical stores",
      currentMemory: {},
    })

    expect(result).toEqual({
      physical_stores:
        "common_sense:some companies have physical store locations:1",
    })

    // Verify the schema was called correctly
    expect(sendAI).toHaveBeenCalledWith({
      model: MODELS.nano,
      messages: expect.any(Array),
      mode: "structured",
      schema: expect.any(Object),
    })
  })

  it("should handle empty memory response", async () => {
    const { sendAI } = await import("@core/messages/api/sendAI")

    // Mock AI response with empty memory
    const mockResponse: TResponse<{ text: string }> = {
      success: true,
      data: {
        text: "",
      },
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: [],
    }

    vi.mocked(sendAI).mockResolvedValue(mockResponse)

    const result = await makeLearning({
      toolLogs: "no significant learnings",
      nodeSystemPrompt: "simple task",
      currentMemory: {},
    })

    expect(result).toEqual({})
  })

  it("should handle AI errors gracefully", async () => {
    const { sendAI } = await import("@core/messages/api/sendAI")

    // Mock AI error response
    const mockResponse: TResponse<{ physical_stores: string }> = {
      success: false,
      error: "API error",
      usdCost: 0,
      debug_input: [],
      data: null,
      debug_output: [],
    }

    vi.mocked(sendAI).mockResolvedValue(mockResponse)

    const result = await makeLearning({
      toolLogs: "some logs",
      nodeSystemPrompt: "some prompt",
      currentMemory: {},
    })

    expect(result).toBeNull()
  })
})
