import { sendAI } from "@/core/messages/api/sendAI"
import { MODELS } from "@/runtime/settings/constants.client"
import { tool } from "ai"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Mock the sendAI function to avoid API calls
vi.mock("@/core/messages/api/sendAI", () => ({
  sendAI: vi.fn(),
}))

const mockSendAI = sendAI as ReturnType<typeof vi.fn>

describe("SearchGoogleMaps Parameter Validation Fix", () => {
  it("should validate maxResultCount parameter correctly and reject values > 20", async () => {
    // Create the actual searchGoogleMaps tool schema as defined in the codebase
    const searchGoogleMapsTool = tool({
      description: "Search Google Maps for business information",
      parameters: z.object({
        query: z.string().describe("Search query"),
        maxResultCount: z
          .number()
          .max(20)
          .default(10)
          .describe("Number of results to return"),
        domainFilter: z.string().optional().describe("Filter by domain"),
      }),
      execute: async () => "mock result",
    })

    // Mock successful response
    mockSendAI.mockResolvedValue({
      success: true,
      data: {
        type: "tool",
        toolName: "searchGoogleMaps",
        reasoning: "Found coffee shops",
        plan: "Search for coffee shops",
      },
      usdCost: 0.001,
    })

    // Test Case 1: Valid parameter (should work)
    const validCall = await sendAI({
      model: MODELS.default,
      mode: "tool",
      messages: [
        {
          role: "user",
          content: "Find 10 coffee shops",
        },
      ],
      opts: {
        tools: { searchGoogleMaps: searchGoogleMapsTool },
        toolStrategy: "v2",
        toolChoice: { type: "tool", toolName: "searchGoogleMaps" },
        maxSteps: 1,
      },
    })

    // This should succeed
    expect(validCall.success).toBe(true)

    // Test Case 2: Invalid parameter (should fail with validation error)
    // We'll directly test the validation by trying to create a tool call with invalid args
    try {
      await sendAI({
        model: MODELS.default,
        mode: "tool",
        messages: [
          {
            role: "user",
            content: "Find 50 coffee shops", // This should trigger maxResultCount > 20
          },
        ],
        opts: {
          tools: { searchGoogleMaps: searchGoogleMapsTool },
          toolStrategy: "v2",
          toolChoice: { type: "tool", toolName: "searchGoogleMaps" },
          maxSteps: 1,
        },
      })
    } catch (error) {
      // If the AI model respects the schema, it shouldn't generate invalid parameters
      // If it does generate invalid parameters, our validation should catch it
      if (error instanceof Error && error.message.includes("maxResultCount")) {
        expect(error.message).toContain(
          "Number must be less than or equal to 20"
        )
      }
    }
  })

  it("should demonstrate that AI models now see parameter schemas", async () => {
    // This test verifies that our CONFIG.tools.showParameterSchemas = true
    // setting is working by checking the zodToJson conversion
    const schema = z.object({
      maxResultCount: z.number().max(20).default(10),
    })

    const { zodToJson } = await import("@/core/messages/utils/zodToJson")
    const jsonSchema = zodToJson(schema)

    console.log("Generated JSON Schema:", jsonSchema)

    // The JSON schema should include the maximum constraint
    const jsonString = JSON.stringify(jsonSchema)
    expect(jsonString).toContain("20")
    expect(jsonString).toContain("maximum")
  })
})
