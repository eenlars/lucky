import { selectToolStrategyV2 } from "@tools/any/selectToolStrategyV2"
import { getModels, getSettings } from "@utils/config/runtimeConfig"
import { tool } from "ai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Mock sendAI to control the response
vi.mock("@messages/api/sendAI", () => ({
  sendAI: vi.fn().mockResolvedValue({
    success: true,
    data: {
      type: "tool",
      toolName: "searchGoogleMaps",
      reasoning: "Test reasoning",
      plan: "Test plan",
    },
    usdCost: 0.001,
  }),
}))

describe("Parameter Schema Visibility Fix", () => {
  const mockSearchGoogleMapsTool = tool({
    description: "Search Google Maps for business information",
    parameters: z.object({
      query: z.string().describe("Search query"),
      maxResultCount: z
        .number()
        .max(20)
        .default(10)
        .describe("Number of results to return"),
    }),
    execute: async () => "mock result",
  })

  const mockTools = {
    searchGoogleMaps: mockSearchGoogleMapsTool,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should include parameter schemas when getSettings().tools.showParameterSchemas is true", async () => {
    // Verify config is set correctly
    expect(getSettings().tools.showParameterSchemas).toBe(true)

    const { sendAI } = await import("@messages/api/sendAI")

    await selectToolStrategyV2(
      mockTools,
      [],
      [],
      3,
      "Test system message",
      getModels().default
    )

    // Verify sendAI was called
    expect(sendAI).toHaveBeenCalled()

    // Get the first call's arguments
    const firstCall = (sendAI as any).mock.calls[0][0]
    const userMessage = firstCall.messages.find((m: any) => m.role === "user")

    // Verify that parameter schemas are included in the tool description
    expect(userMessage.content).toContain("Args:")
    expect(userMessage.content).toContain("maxResultCount")
    expect(userMessage.content).toContain("maximum")
    expect(userMessage.content).not.toContain("not shown")
  })

  it("should show parameter constraints including max value limits", async () => {
    const { sendAI } = await import("@messages/api/sendAI")

    await selectToolStrategyV2(
      mockTools,
      [],
      [],
      3,
      "Test system message",
      getModels().default
    )

    const firstCall = (sendAI as any).mock.calls[0][0]
    const userMessage = firstCall.messages.find((m: any) => m.role === "user")

    // The AI should see the parameter schema with the max constraint
    // This should prevent it from generating maxResultCount values > 20
    expect(userMessage.content).toContain("20")
  })
})
