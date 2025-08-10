import * as sendAIModule from "@core/messages/api/sendAI/sendAI"
import { getDefaultModels } from "@runtime/settings/models"
import { afterEach, describe, expect, it, vi } from "vitest"
import { makeLearning } from "../../prompts/makeLearning"

describe("makeLearning Integration Test", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should handle AI response that returns memory directly (not wrapped)", async () => {
    vi.spyOn(sendAIModule, "sendAI").mockResolvedValue({
      success: true,
      data: {
        physical_stores:
          "common_sense:some companies have physical store locations:1",
      },
      usdCost: 0,
      error: null,
      debug_input: [],
      debug_output: [],
    } as any)

    const result = await makeLearning({
      toolLogs: "text: Rituals has physical stores",
      nodeSystemPrompt: "check if this company has physical stores",
      currentMemory: {},
    })

    expect(result.updatedMemory).toEqual({
      physical_stores:
        "common_sense:some companies have physical store locations:1",
    })
    expect(result.agentStep.type).toBe("learning")
    expect(result.agentStep.return).toContain("physical_stores:")

    // Verify the schema was called correctly
    expect(sendAIModule.sendAI).toHaveBeenCalledWith({
      model: getDefaultModels().nano,
      messages: expect.any(Array),
      mode: "structured",
      schema: expect.any(Object),
    })
  })

  it("should handle empty memory response", async () => {
    vi.spyOn(sendAIModule, "sendAI").mockResolvedValue({
      success: true,
      data: {},
      usdCost: 0,
      error: null,
      debug_input: [],
      debug_output: [],
    } as any)

    const result = await makeLearning({
      toolLogs: "no significant learnings",
      nodeSystemPrompt: "simple task",
      currentMemory: {},
    })

    expect(result.updatedMemory).toEqual({})
    expect(result.agentStep.type).toBe("learning")
    expect(result.agentStep.return).toBe("")
  })

  it("should handle AI errors gracefully", async () => {
    vi.spyOn(sendAIModule, "sendAI").mockResolvedValue({
      success: false,
      error: "API error",
      usdCost: 0,
      debug_input: [],
      data: null,
      debug_output: [],
    } as any)

    const result = await makeLearning({
      toolLogs: "some logs",
      nodeSystemPrompt: "some prompt",
      currentMemory: {},
    })

    expect(result.agentStep.type).toBe("error")
    expect(result.updatedMemory).toEqual({})
  })
})
