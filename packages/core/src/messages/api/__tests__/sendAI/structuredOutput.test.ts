import { sendAI } from "@/messages/api/sendAI"
import { MODELS } from "@/runtime/settings/constants.client"
import { generateObject } from "ai"
import { vi } from "vitest"
import { z } from "zod"

// Mock the dependencies
vi.mock("ai", () => ({
  generateText: vi.fn(),
  generateObject: vi.fn(),
}))

vi.mock("@/core/utils/clients/openrouter/openrouterClient", () => ({
  openrouter: vi.fn((model: string) => `mocked-${model}`),
}))

vi.mock("@/core/utils/spending/SpendingTracker", () => ({
  SpendingTracker: {
    getInstance: () => ({
      canMakeRequest: () => true,
      addCost: vi.fn(),
    }),
  },
}))

vi.mock("@/core/messages/utils/saveResult", () => ({
  saveResultOutput: vi.fn(),
}))

vi.mock("@/runtime/code_tools/file-saver/save", () => ({
  saveInLoc: vi.fn(),
}))

describe("sendAIRequest with structuredOutput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should use generateObject for structured output", async () => {
    const mockedGenerateObject = vi.mocked(generateObject)

    // Define test schema
    const testSchema = z.object({
      name: z.string(),
      age: z.number().min(0).max(150),
      email: z.string().email(),
    })

    // Mock successful response
    mockedGenerateObject.mockResolvedValueOnce({
      object: {
        name: "John Doe",
        age: 30,
        email: "john@example.com",
      },
      usage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    } as any)

    // Call sendAIRequest with structuredOutput
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
      output: "object",
    })

    // Verify success
    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      name: "John Doe",
      age: 30,
      email: "john@example.com",
    })
    expect(result.error).toBeNull()

    // Verify generateObject was called correctly
    expect(mockedGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        schema: testSchema,
        output: "object",
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: "user",
            content: "Generate a person object with name, age, and email",
          }),
        ]),
      })
    )
  })

  it("should support array output type", async () => {
    const mockedGenerateObject = vi.mocked(generateObject)

    const itemSchema = z.object({
      id: z.string(),
      name: z.string(),
    })

    mockedGenerateObject.mockResolvedValueOnce({
      object: [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ],
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
          content: "Generate a list of items",
        },
      ],
      model: MODELS.default,
      mode: "structured",
      schema: itemSchema,
      output: "array",
    })

    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
    expect(mockedGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        output: "array",
      })
    )
  })

  it("should support enum output type", async () => {
    const mockedGenerateObject = vi.mocked(generateObject)

    mockedGenerateObject.mockResolvedValueOnce({
      object: "action",
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
          content: "Classify this movie genre",
        },
      ],
      model: MODELS.default,
      mode: "structured",
      schema: z.string(),
      output: "object",
      enum: ["action", "comedy", "drama", "horror", "sci-fi"],
    })

    expect(result.success).toBe(true)
    expect(result.data).toBe("action")
    expect(mockedGenerateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        output: "enum",
        enum: ["action", "comedy", "drama", "horror", "sci-fi"],
      })
    )
  })

  it("should handle generateObject errors", async () => {
    const mockedGenerateObject = vi.mocked(generateObject)

    const testSchema = z.object({
      name: z.string(),
    })

    mockedGenerateObject.mockRejectedValueOnce(new Error("AI model error"))

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

    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.error).toBe("AI model error")
  })
})
