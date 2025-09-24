import { CONFIG } from "@runtime/settings/constants"
import { getDefaultModels } from "@runtime/settings/models"
import { tool, zodSchema } from "ai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Use per-test overrides to avoid hoist issues and bun test incompatibilities
// We dynamically import and doMock inside tests.

describe("Parameter Schema Visibility", () => {
  const mockSearchGoogleMapsTool = tool({
    description: "Search Google Maps for business information",
    inputSchema: zodSchema(
      z.object({
        query: z.string().describe("Search query"),
        maxResultCount: z
          .number()
          .max(20)
          .default(10)
          .describe("Number of results to return"),
      })
    ),
    execute: async () => "mock result",
  })

  const mockTools = {
    searchGoogleMaps: mockSearchGoogleMapsTool,
  }

  let originalShowParameterSchemas: boolean

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    originalShowParameterSchemas = CONFIG.tools.showParameterSchemas
  })

  afterEach(() => {
    ;(CONFIG.tools as any).showParameterSchemas = originalShowParameterSchemas
  })

  it("should include parameter schemas when enabled", async () => {
    ;(CONFIG.tools as any).showParameterSchemas = true

    // Per-test mock of sendAI
    vi.doMock("@core/messages/api/sendAI/sendAI", () => ({
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
    const { sendAI } = await import("@core/messages/api/sendAI/sendAI")
    const { selectToolStrategyV2 } = await import(
      "@core/messages/pipeline/selectTool/selectToolStrategyV2"
    )

    await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt: "",
      agentSteps: [],
      roundsLeft: 3,
      systemMessage: "Test system message",
      model: getDefaultModels().default,
    })

    const mocked = vi.mocked(sendAI)
    expect(mocked).toBeDefined()
    expect(mocked.mock.calls.length).toBeGreaterThan(0)
    const firstCall = mocked.mock.calls[0]?.[0] as any
    expect(firstCall).toBeDefined()
    const userMessage = firstCall.messages.find((m: any) => m.role === "user")

    expect(userMessage.content).toContain("Args:")
    expect(userMessage.content).toContain("maxResultCount")
    expect(userMessage.content).toContain("maximum")
    expect(userMessage.content).toContain("20")
    expect(userMessage.content).not.toContain("not shown")
  })

  it("should hide parameter schemas when disabled", async () => {
    ;(CONFIG.tools as any).showParameterSchemas = false

    vi.doMock("@core/messages/api/sendAI/sendAI", () => ({
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
    const { sendAI } = await import("@core/messages/api/sendAI/sendAI")
    const { selectToolStrategyV2 } = await import(
      "@core/messages/pipeline/selectTool/selectToolStrategyV2"
    )

    await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt: "",
      agentSteps: [],
      roundsLeft: 3,
      systemMessage: "Test system message",
      model: getDefaultModels().default,
    })

    const mocked = vi.mocked(sendAI)
    expect(mocked.mock.calls.length).toBeGreaterThan(0)
    const firstCall = mocked.mock.calls[0]?.[0] as any
    expect(firstCall).toBeDefined()
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
        })
      ),
      execute: async () => "complex result",
    })

    const complexTools = { complexTool }

    vi.doMock("@core/messages/api/sendAI/sendAI", () => ({
      sendAI: vi.fn().mockResolvedValue({
        success: true,
        data: { type: "tool", toolName: "complexTool" },
        usdCost: 0.001,
      }),
    }))
    const { sendAI } = await import("@core/messages/api/sendAI/sendAI")
    const { selectToolStrategyV2 } = await import(
      "@core/messages/pipeline/selectTool/selectToolStrategyV2"
    )

    await selectToolStrategyV2({
      tools: complexTools,
      identityPrompt: "",
      agentSteps: [],
      roundsLeft: 3,
      systemMessage: "Test system message",
      model: getDefaultModels().default,
    })

    const mocked = vi.mocked(sendAI)
    expect(mocked.mock.calls.length).toBeGreaterThan(0)
    const firstCall = mocked.mock.calls[0]?.[0] as any
    expect(firstCall).toBeDefined()
    const userMessage = firstCall.messages.find((m: any) => m.role === "user")

    expect(userMessage.content).toContain("maxResults")
    expect(userMessage.content).toContain("includeMetadata")
    expect(userMessage.content).toContain("100")
    expect(userMessage.content).toContain("enum")
    expect(userMessage.content).not.toContain("not shown")
  })
})
