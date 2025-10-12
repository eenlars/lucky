import { getDefaultModels } from "@core/core-config/coreConfig"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { generateText } from "ai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// TODO: Test setup is overly complex with too many mocks
// Consider using a test factory or builder pattern to simplify
// Mock the dependencies
vi.mock("ai", () => ({
  generateText: vi.fn(),
  tool: vi.fn((config: any) => config),
  genObject: vi.fn(),
  stepCountIs: vi.fn((count: number) => ({ type: "stepCount", count })),
  zodSchema: vi.fn((schema: any) => schema),
}))

vi.mock("@core/clients/openrouter/openrouterClient", () => ({
  openrouter: vi.fn((model: string) => `mocked-${model}`),
}))

vi.mock("@core/models/getLanguageModel", () => ({
  getLanguageModel: vi.fn((model: string) => `mocked-${model}`),
  getLanguageModelWithReasoning: vi.fn((model: string, _opts?: any) => `mocked-${model}`),
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

vi.mock("@lucky/tools/definitions/file-saver/save", () => ({
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

vi.mock("@examples/settings/constants", () => ({
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
      allowCycles: true,
      maxFilesPerWorkflow: 1,
      enforceFileLimit: true,
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

// TODO: Missing tests for edge cases:
// - Network errors and retries
// - Malformed JSON responses
// - Partial schema matches
// - Timeout scenarios
// - Different model providers
describe("sendAIRequest with expectedOutput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should validate response against provided Zod schema", async () => {
    const mockedGenerateText = generateText as any

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
      model: getDefaultModels().default,
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

    // Verify generateText was called with correct system message (robust to prompt changes)
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("strictly returns JSON data"),
          }),
        ]),
      }),
    )
    // Also ensure we instruct the model to wrap the JSON in <json> tags
    expect(mockedGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "system",
            content: expect.stringContaining("<json>"),
          }),
        ]),
      }),
    )
  })

  it("should fail when response doesn't match schema", async () => {
    const mockedGenerateText = generateText as any

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
      model: getDefaultModels().default,
      mode: "structured",
      schema: testSchema,
    })

    // Verify failure
    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    // Allow either direct validation failure or post-repair failure
    expect(result.error).toMatch(/(JSON validation failed|Failed to repair JSON)/)
  })

  it("should handle non-JSON response", async () => {
    const mockedGenerateText = generateText as any

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
      model: getDefaultModels().default,
      mode: "structured",
      schema: testSchema,
    })

    // Verify failure
    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.error).toMatch(/^(No valid JSON found in response:|Failed to repair JSON)/)
  })
})
