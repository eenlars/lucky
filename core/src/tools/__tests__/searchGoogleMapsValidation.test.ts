import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { getDefaultModels } from "@runtime/settings/constants.client"
import { tool } from "ai"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Mock the sendAI function to avoid API calls
vi.mock("@core/messages/api/sendAI", () => ({
  sendAI: vi.fn(),
}))
// TODO: The mock path doesn't match the import path. Import is from '@core/messages/api/sendAI/sendAI'
// but mock is for '@core/messages/api/sendAI'. This might cause the mock to not work properly.

const mockSendAI = sendAI as ReturnType<typeof vi.fn>

describe("SearchGoogleMaps Parameter Validation Fix", () => {
  // TODO: This test creates its own searchGoogleMaps tool instead of testing the actual
  // implementation. It should import and test the real searchGoogleMaps tool to ensure
  // the actual tool has proper validation, not just a mock version.
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
    // TODO: This mock doesn't include any tool execution results or parameters.
    // It's mocking a tool selection response, not a tool execution response.
    // The test isn't actually testing parameter validation in execution.

    // Test Case 1: Valid parameter (should work)
    const validCall = await sendAI({
      model: getDefaultModels().default,
      mode: "tool",
      messages: [
        {
          role: "user",
          content: "Find 10 coffee shops",
        },
      ],
      opts: {
        tools: { searchGoogleMaps: searchGoogleMapsTool },
        toolChoice: { type: "tool", toolName: "searchGoogleMaps" },
        maxSteps: 1,
      },
    })

    // This should succeed
    expect(validCall.success).toBe(true)
    // TODO: This test is meaningless - it's testing that a mocked function returns what we mocked.
    // The mock always returns success:true regardless of input. This doesn't test validation at all.

    // Test Case 2: Invalid parameter (should fail with validation error)
    // We'll directly test the validation by trying to create a tool call with invalid args
    try {
      await sendAI({
        model: getDefaultModels().default,
        mode: "tool",
        messages: [
          {
            role: "user",
            content: "Find 50 coffee shops", // This should trigger maxResultCount > 20
          },
        ],
        opts: {
          tools: { searchGoogleMaps: searchGoogleMapsTool },
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
    // TODO: This test has multiple problems:
    // 1) The mocked sendAI never throws errors, so this catch block never executes
    // 2) Even if it did throw, the test doesn't verify the error was thrown
    // 3) The user message "Find 50 coffee shops" doesn't directly translate to maxResultCount=50
    // 4) This tests AI interpretation of natural language, not parameter validation
  })

  it("should demonstrate that AI models now see parameter schemas", async () => {
    // This test verifies that our CONFIG.tools.showParameterSchemas = true
    // setting is working by checking the zodToJson conversion
    const schema = z.object({
      maxResultCount: z.number().max(20).default(10),
    })

    const { zodToJson } = await import("@core/utils/zod/zodToJson")
    const jsonSchema = zodToJson(schema)

    console.log("Generated JSON Schema:", jsonSchema)
    // TODO: Console.log in tests instead of proper assertions

    // The JSON schema should include the maximum constraint
    const jsonString = JSON.stringify(jsonSchema)
    expect(jsonString).toContain("20")
    expect(jsonString).toContain("maximum")
    // TODO: Testing string containment in JSON is fragile. Should test the actual
    // structure: expect(jsonSchema.properties.maxResultCount.maximum).toBe(20)
    // Also, this only tests zodToJson conversion, not how it's used in the actual tool system.
  })
})
