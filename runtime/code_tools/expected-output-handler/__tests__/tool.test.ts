import type { ToolExecutionContext } from "@core/tools/toolFactory"
import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import { tool as expectedOutputHandler } from "../tool"

// Mock the sendAIRequest function
const mockSendAIRequest = vi.fn()
vi.mock("@core/messages/api/sendAIRequest", () => ({
  sendAIRequest: mockSendAIRequest,
}))

describe("expectedOutputHandler", () => {
  // FAILING: Mock sendAIRequest is never called, possibly due to validation or execution flow issues
  it("should transform data according to the provided schema", async () => {
    // Setup the mock implementation
    mockSendAIRequest.mockResolvedValue({
      success: true,
      data: {
        answer: "4",
        confidence: 100,
        reasoning: "Adding the two numbers 2 and 2 yields 4 by basic arithmetic.",
      },
      error: null,
      usdCost: 0.001,
      debug_input: [],
    })

    // Define the expected schema
    const expectedSchema = z.object({
      answer: z.string(),
      confidence: z.number().min(0).max(100),
      reasoning: z.string().nullish(),
    })

    // Mock context with the schema
    const mockContext: ToolExecutionContext = {
      workflowInvocationId: "test-id",
      workflowVersionId: "test-v1",
      workflowFiles: [],
      expectedOutputType: expectedSchema,
      mainWorkflowGoal: "test-goal",
      workflowId: "test-workflow-id",
    }

    // Execute the tool
    const params = {
      dataToTransform:
        "What is 2 + 2? Please provide your answer with a confidence level between 0-100 and your reasoning.",
      strictness: "lenient" as const,
    }

    const result = await expectedOutputHandler.execute(params, mockContext)

    // Verify the outer result structure
    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()

    // Type guard to ensure data is not null
    if (!result.data) {
      throw new Error("Expected result.data to be defined")
    }

    // Verify the inner tool result structure
    expect(result.data.tool).toBe("expectedOutputHandler")
    expect(result.data.success).toBe(true)
    expect(result.data.error).toBeNull()
    expect(result.data.output).toEqual(
      expect.objectContaining({
        answer: "4",
        confidence: expect.any(Number),
        reasoning: expect.any(String),
      })
    )

    // Verify sendAIRequest was called with correct parameters
    expect(mockSendAIRequest).toHaveBeenCalledWith({
      systemPrompt: expect.stringContaining("expert at transforming data"),
      model: expect.any(String),
      messages: [
        {
          role: "user",
          content: params.dataToTransform,
        },
      ],
      structuredOutput: {
        schema: expectedSchema,
        output: "object",
      },
    })

    // Validate the result output matches the schema
    const validation = expectedSchema.safeParse(result.data.output)
    expect(validation.success).toBe(true)
  })
})
