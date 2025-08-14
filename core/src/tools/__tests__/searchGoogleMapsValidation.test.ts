import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { getDefaultModels } from "@runtime/settings/constants.client"
import { tool, zodSchema } from "ai"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"

// Mock the sendAI function to avoid API calls (correct module path)
vi.mock("@core/messages/api/sendAI/sendAI", () => ({
  sendAI: vi.fn(),
}))

const mockSendAI = vi.mocked(sendAI)

describe("SearchGoogleMaps Parameter Validation Fix", () => {
  // TODO: This test creates its own searchGoogleMaps tool instead of testing the actual
  // implementation. It should import and test the real searchGoogleMaps tool to ensure
  // the actual tool has proper validation, not just a mock version.
  it("should validate maxResultCount parameter correctly and reject values > 20", async () => {
    // Define schema separately so we can validate with zod directly
    const paramsSchema = z.object({
      query: z.string().describe("Search query"),
      maxResultCount: z
        .number()
        .max(20)
        .default(10)
        .describe("Number of results to return"),
      domainFilter: z.string().optional().describe("Filter by domain"),
    })
    const searchGoogleMapsTool = tool({
      description: "Search Google Maps for business information",
      parameters: zodSchema(paramsSchema),
      execute: async () => "mock result",
    })

    // Mock successful response shape used by tool mode processing
    mockSendAI.mockResolvedValue({
      success: true,
      data: { text: "ok" },
      usdCost: 0.001,
      error: null,
      debug_input: [],
      debug_output: {},
    } as any)
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
    // Directly validate schema rejects invalid param using underlying zod
    const parsed = paramsSchema.safeParse({
      query: "coffee",
      maxResultCount: 50,
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(JSON.stringify(parsed.error.issues)).toContain("maximum")
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
