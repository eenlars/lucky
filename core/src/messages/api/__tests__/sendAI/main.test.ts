import { sendAI } from "@core/messages/api/sendAI"
import { MODELS } from "@runtime/settings/constants.client"
import { generateText } from "ai"
import { vi } from "vitest"
import { z } from "zod"

// Mock the dependencies
vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

vi.mock("@core/utils/clients/openrouter/openrouterClient", () => ({
  openrouter: vi.fn((model: string) => `mocked-${model}`),
}))

vi.mock("@core/utils/spending/SpendingTracker", () => ({
  SpendingTracker: {
    getInstance: () => ({
      canMakeRequest: () => true,
      addCost: vi.fn(),
    }),
  },
}))

vi.mock("@core/messages/utils/saveResult", () => ({
  saveResultOutput: vi.fn(),
}))

vi.mock("@runtime/code_tools/file-saver/save", () => ({
  saveInLoc: vi.fn(),
}))

vi.mock("@core/messages", () => ({
  Messages: {
    sendAI: vi.fn().mockResolvedValue({
      success: false,
      error: "Mocked repair failure",
      usdCost: 0,
    }),
  },
}))

vi.mock("@runtime/settings/constants", () => ({
  CONFIG: {
    logging: {
      override: {
        API: false,
      },
    },
    models: {
      inactive: new Set(),
      provider: "openai",
    },
    limits: {
      rateWindowMs: 1000,
      maxRequestsPerWindow: 100,
      enableSpendingLimits: false,
      maxCostUsdPerRun: 100,
    },
    verification: {
      enableOutputValidation: false,
    },
    tools: {
      maxStepsVercel: 10,
      inactive: new Set(),
    },
  },
  MODELS: {
    nano: "test-model",
  },
}))

describe("sendAIRequest with expectedOutput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should validate response against provided Zod schema", async () => {
    const mockedGenerateText = vi.mocked(generateText)

    // Define test schema
    const testSchema = z.object({
      name: z.string(),
      age: z.number().min(0).max(150),
      email: z.string().email(),
    })

    // Mock successful response with valid JSON
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        name: "John Doe",
        age: 30,
        email: "john@example.com",
      }),
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    } as any)

    // Call sendAIRequest with schema
    const result = await sendAI({
      messages: [
        {
          role: "user",
          content: "Generate a person object with name, age, and email",
        },
      ],
      model: MODELS.default,
      mode: "structured",
      schema: testSchema,
    })

    // Verify success
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      name: "John Doe",
      age: 30,
      email: "john@example.com",
    })
    expect(result.error).toBeNull()

    // Verify generateText was called with correct system message
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining(
              "Return **ONLY** a single JSON object"
            ),
          }),
        ]),
      })
    )
  })

  it("should fail when response doesn't match schema", async () => {
    const mockedGenerateText = vi.mocked(generateText)

    const testSchema = z.object({
      name: z.string(),
      age: z.number(),
    })

    // Mock response with invalid data (age as string)
    mockedGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        name: "Jane",
        age: "thirty", // Invalid: should be number
      }),
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    } as any)

    const result = await sendAI({
      messages: [
        {
          role: "user",
          content: "Generate a person",
        },
      ],
      model: MODELS.default,
      mode: "structured",
      schema: testSchema,
    })

    // Verify failure
    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.error).toContain("Schema validation failed")
  })

  it("should handle non-JSON response", async () => {
    const mockedGenerateText = vi.mocked(generateText)

    const testSchema = z.object({
      result: z.string(),
    })

    // Mock response with plain text (not JSON)
    mockedGenerateText.mockResolvedValueOnce({
      text: "This is not JSON",
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    } as any)

    const result = await sendAI({
      messages: [
        {
          role: "user",
          content: "Generate something",
        },
      ],
      model: MODELS.default,
      mode: "structured",
      schema: testSchema,
    })

    // Verify failure
    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.error).toBe(
      "No JSON found in the response, please try again."
    )
  })
})
