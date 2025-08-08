import { selectToolStrategyV2 } from "@core/tools/any/selectToolStrategyV2"
import { CONFIG } from "@runtime/settings/constants"
import { getDefaultModels } from "@runtime/settings/models"
import { tool } from "ai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Mock sendAI to control the response
vi.mock("@core/messages/api/sendAI", () => ({
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

describe("Parameter Schema Visibility", () => {
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

  let originalShowParameterSchemas: boolean

  beforeEach(() => {
    vi.clearAllMocks()
    originalShowParameterSchemas = CONFIG.tools.showParameterSchemas
  })

  afterEach(() => {
    ;(CONFIG.tools as any).showParameterSchemas = originalShowParameterSchemas
  })

  it("should include parameter schemas when enabled", async () => {
    ;(CONFIG.tools as any).showParameterSchemas = true

    const { sendAI } = await import("@core/messages/api/sendAI")

    await selectToolStrategyV2({
      tools: mockTools,
      messages: [],
      nodeLogs: [],
      roundsLeft: 3,
      systemMessage: "Test system message",
      model: getDefaultModels().default,
    })

    const firstCall = (sendAI as any).mock.calls[0][0]
    const userMessage = firstCall.messages.find((m: any) => m.role === "user")

    expect(userMessage.content).toContain("Args:")
    expect(userMessage.content).toContain("maxResultCount")
    expect(userMessage.content).toContain("maximum")
    expect(userMessage.content).toContain("20")
    expect(userMessage.content).not.toContain("not shown")
  })

  it("should hide parameter schemas when disabled", async () => {
    ;(CONFIG.tools as any).showParameterSchemas = false

    const { sendAI } = await import("@core/messages/api/sendAI")

    await selectToolStrategyV2({
      tools: mockTools,
      messages: [],
      nodeLogs: [],
      roundsLeft: 3,
      systemMessage: "Test system message",
      model: getDefaultModels().default,
    })

    const firstCall = (sendAI as any).mock.calls[0][0]
    const userMessage = firstCall.messages.find((m: any) => m.role === "user")

    expect(userMessage.content).toContain("Tool: searchGoogleMaps")
    expect(userMessage.content).toContain(
      "Description: Search Google Maps for business information"
    )
    expect(userMessage.content).toContain("Args: not shown")
    expect(userMessage.content).not.toContain("maxResultCount")
  })

  it("should work with complex tool parameter patterns", async () => {
    ;(CONFIG.tools as any).showParameterSchemas = true

    const complexTool = tool({
      description: "Complex tool with various parameter types",
      parameters: z.object({
        query: z.string().describe("Search query"),
        options: z.object({
          maxResults: z.number().max(100).default(10),
          includeMetadata: z.boolean().default(false),
          tags: z.array(z.string()).optional(),
        }),
        mode: z.enum(["fast", "thorough"]).default("fast"),
        filters: z.union([z.string(), z.array(z.string())]).optional(),
      }),
      execute: async () => "complex result",
    })

    const complexTools = { complexTool }

    const { sendAI } = await import("@core/messages/api/sendAI")

    await selectToolStrategyV2({
      tools: complexTools,
      messages: [],
      nodeLogs: [],
      roundsLeft: 3,
      systemMessage: "Test system message",
      model: getDefaultModels().default,
    })

    const firstCall = (sendAI as any).mock.calls[0][0]
    const userMessage = firstCall.messages.find((m: any) => m.role === "user")

    // Should contain the complex schema information
    expect(userMessage.content).toContain("maxResults")
    expect(userMessage.content).toContain("includeMetadata")
    expect(userMessage.content).toContain("100") // max constraint
    expect(userMessage.content).toContain("enum") // for mode field
    expect(userMessage.content).not.toContain("not shown")
  })

  it("should handle mixed parameter types (Zod and Vercel AI)", async () => {
    ;(CONFIG.tools as any).showParameterSchemas = true

    const zodTool = tool({
      description: "Tool with Zod parameters",
      parameters: z.object({
        query: z.string(),
      }),
      execute: async () => "zod result",
    })

    const vercelTool = {
      description: "Tool with Vercel AI parameters",
      parameters: {
        jsonSchema: {
          type: "object",
          properties: {
            input: { type: "string" },
          },
        },
      },
      execute: async () => "vercel result",
    }

    const mixedTools = { zodTool, vercelTool }

    const { sendAI } = await import("@core/messages/api/sendAI")

    await selectToolStrategyV2({
      tools: mixedTools as any,
      messages: [],
      nodeLogs: [],
      roundsLeft: 3,
      systemMessage: "Test system message",
      model: getDefaultModels().default,
    })

    const firstCall = (sendAI as any).mock.calls[0][0]
    const userMessage = firstCall.messages.find((m: any) => m.role === "user")

    // Both tools should show their schemas
    expect(userMessage.content).toContain("Tool: zodTool")
    expect(userMessage.content).toContain("Tool: vercelTool")
    expect(userMessage.content).toContain("query") // from Zod tool
    expect(userMessage.content).toContain("input") // from Vercel AI tool
    expect(userMessage.content).not.toContain("not shown")
  })
})
