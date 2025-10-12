import { getDefaultModels } from "@core/core-config/coreConfig"
import { getCoreConfig, initCoreConfig } from "@core/core-config/coreConfig"
import { tool, zodSchema } from "ai"
import { type MockInstance, afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

describe("Parameter Schema Visibility", () => {
  const mockSearchGoogleMapsTool = tool({
    description: "Search Google Maps for business information",
    inputSchema: zodSchema(
      z.object({
        query: z.string().describe("Search query"),
        maxResultCount: z.number().max(20).default(10).describe("Number of results to return"),
      }),
    ),
    execute: async () => "mock result",
  })

  const mockTools = {
    searchGoogleMaps: mockSearchGoogleMapsTool,
  }

  let sendAISpy: MockInstance | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    initCoreConfig()
  })

  afterEach(() => {
    initCoreConfig()
    sendAISpy?.mockRestore()
    sendAISpy = undefined
  })

  it("should include parameter schemas when enabled", async () => {
    const sendAIModule = await import("@core/messages/api/sendAI/sendAI")
    sendAISpy = vi.spyOn(sendAIModule, "sendAI").mockResolvedValue({
      success: true,
      data: {
        text: "searchGoogleMaps",
        reasoning: "Test reasoning",
      },
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: null,
    })
    const { selectToolStrategyV2 } = await import("@core/messages/pipeline/selectTool/selectToolStrategyV2")

    await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt: "",
      agentSteps: [],
      roundsLeft: 3,
      systemMessage: "Test system message",
      model: getDefaultModels().default,
    })

    expect(sendAISpy).toBeDefined()
    expect(sendAISpy?.mock.calls.length ?? 0).toBeGreaterThan(0)
    const firstCall = sendAISpy?.mock.calls[0]?.[0] as any
    expect(firstCall).toBeDefined()
    const userMessage = firstCall.messages.find((m: any) => m.role === "user")

    expect(userMessage.content).toContain("Args:")
    expect(userMessage.content).toContain("maxResultCount")
    expect(userMessage.content).toContain("maximum")
    expect(userMessage.content).toContain("20")
    expect(userMessage.content).not.toContain("not shown")
  })

  it("should hide parameter schemas when disabled", async () => {
    const currentTools = getCoreConfig().tools
    initCoreConfig({
      tools: {
        ...currentTools,
        showParameterSchemas: false,
      },
    })

    const sendAIModule = await import("@core/messages/api/sendAI/sendAI")
    sendAISpy = vi.spyOn(sendAIModule, "sendAI").mockResolvedValue({
      success: true,
      data: {
        text: "searchGoogleMaps",
        reasoning: "Test reasoning",
      },
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: null,
    })
    const { selectToolStrategyV2 } = await import("@core/messages/pipeline/selectTool/selectToolStrategyV2")

    await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt: "",
      agentSteps: [],
      roundsLeft: 3,
      systemMessage: "Test system message",
      model: getDefaultModels().default,
    })

    expect(sendAISpy?.mock.calls.length ?? 0).toBeGreaterThan(0)
    const firstCall = sendAISpy?.mock.calls[0]?.[0] as any
    expect(firstCall).toBeDefined()
    const userMessage = firstCall.messages.find((m: any) => m.role === "user")

    expect(userMessage.content).toContain("Tool: searchGoogleMaps")
    expect(userMessage.content).toContain("Description: Search Google Maps for business information")
    expect(userMessage.content).toContain("Args: not shown")
    expect(userMessage.content).not.toContain("maxResultCount")
  })

  it("should work with complex tool parameter patterns", async () => {
    const complexTool = tool({
      description: "Complex tool with various parameter types",
      inputSchema: zodSchema(
        z.object({
          query: z.string().describe("Search query"),
          options: z.object({
            maxResults: z.number().max(100).default(10),
            includeMetadata: z.boolean().default(false),
            tags: z.array(z.string()).optional(),
          }),
          mode: z.enum(["fast", "thorough"]).default("fast"),
          filters: z.union([z.string(), z.array(z.string())]).optional(),
        }),
      ),
      execute: async () => "complex result",
    })

    const complexTools = { complexTool }

    const sendAIModule = await import("@core/messages/api/sendAI/sendAI")
    sendAISpy = vi.spyOn(sendAIModule, "sendAI").mockResolvedValue({
      success: true,
      data: { text: "complexTool" },
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: null,
    })
    const { selectToolStrategyV2 } = await import("@core/messages/pipeline/selectTool/selectToolStrategyV2")

    await selectToolStrategyV2({
      tools: complexTools,
      identityPrompt: "",
      agentSteps: [],
      roundsLeft: 3,
      systemMessage: "Test system message",
      model: getDefaultModels().default,
    })

    expect(sendAISpy?.mock.calls.length ?? 0).toBeGreaterThan(0)
    const firstCall = sendAISpy?.mock.calls[0]?.[0] as any
    expect(firstCall).toBeDefined()
    const userMessage = firstCall.messages.find((m: any) => m.role === "user")

    expect(userMessage.content).toContain("maxResults")
    expect(userMessage.content).toContain("includeMetadata")
    expect(userMessage.content).toContain("100")
    expect(userMessage.content).toContain("enum")
    expect(userMessage.content).not.toContain("not shown")
  })
})
