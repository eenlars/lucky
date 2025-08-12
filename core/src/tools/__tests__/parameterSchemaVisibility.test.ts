import { selectToolStrategyV2 } from "@core/messages/pipeline/selectTool/selectToolStrategyV2"
import { CONFIG } from "@runtime/settings/constants"
import { getDefaultModels } from "@runtime/settings/models"
import { tool, zodSchema } from "ai"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Mock sendAI to control the response (match the actual import path used by code/tests)
vi.mock("@core/messages/api/sendAI/sendAI", () => ({
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
  // TODO: This test suite mocks sendAI responses but doesn't verify what's actually sent to the AI.
  // The mock always returns the same response regardless of input, which means we're not testing
  // if the schema visibility actually affects AI behavior or tool selection quality.
  const mockSearchGoogleMapsTool = tool({
    description: "Search Google Maps for business information",
    parameters: zodSchema(
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
    originalShowParameterSchemas = CONFIG.tools.showParameterSchemas
  })

  afterEach(() => {
    ;(CONFIG.tools as any).showParameterSchemas = originalShowParameterSchemas
    // TODO: Using 'as any' to bypass TypeScript is a code smell. The CONFIG object should
    // either be properly mutable for tests or use a proper mocking strategy.
  })

  it("should include parameter schemas when enabled", async () => {
    ;(CONFIG.tools as any).showParameterSchemas = true

    const { sendAI } = await import("@core/messages/api/sendAI/sendAI")

    await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt: "",
      agentSteps: [],
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
    // TODO: This test only checks string presence in the message. It should verify:
    // 1) The schema is properly formatted/structured for AI consumption
    // 2) All schema constraints are included (not just 'maximum')
    // 3) The schema format matches what the AI expects
  })

  it("should hide parameter schemas when disabled", async () => {
    ;(CONFIG.tools as any).showParameterSchemas = false

    const { sendAI } = await import("@core/messages/api/sendAI/sendAI")

    await selectToolStrategyV2({
      tools: mockTools,
      identityPrompt: "",
      agentSteps: [],
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
    // TODO: This test creates a complex schema but only tests superficial string presence.
    // It should verify: 1) Nested objects are properly represented
    //                  2) Union types are correctly formatted
    //                  3) Optional fields are marked as such
    //                  4) Default values are communicated
    ;(CONFIG.tools as any).showParameterSchemas = true

    const complexTool = tool({
      description: "Complex tool with various parameter types",
      parameters: zodSchema(
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

    const { sendAI } = await import("@core/messages/api/sendAI/sendAI")

    await selectToolStrategyV2({
      tools: complexTools,
      identityPrompt: "",
      agentSteps: [],
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
    // TODO: This test mixes tool formats but doesn't test the critical aspect:
    // How are different parameter formats normalized for consistent AI consumption?
    // The test should verify the conversion/normalization logic, not just string presence.
    ;(CONFIG.tools as any).showParameterSchemas = true

    const zodTool = tool({
      description: "Tool with Zod parameters",
      parameters: zodSchema(
        z.object({
          query: z.string(),
        })
      ),
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
    // TODO: The vercelTool structure doesn't match the actual Vercel AI tool interface.
    // Real Vercel AI tools don't have a 'parameters.jsonSchema' structure like this.
    // This test might be testing against an incorrect tool format.

    const { sendAI } = await import("@core/messages/api/sendAI/sendAI")

    await selectToolStrategyV2({
      tools: mixedTools as any,
      identityPrompt: "",
      agentSteps: [],
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
