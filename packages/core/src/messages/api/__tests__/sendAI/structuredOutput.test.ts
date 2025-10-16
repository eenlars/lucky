import type { RS } from "@lucky/shared"
import { R } from "@lucky/shared"
import type { ModelMessage } from "ai"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

// TODO: Complex mock setup indicates tight coupling between sendAI and genObject
// Consider refactoring to use dependency injection
// Set up mocks BEFORE importing modules under test
type GenObjectMockFn = (args: {
  messages: ModelMessage[]
  schema: z.ZodSchema
  model?: string
  opts?: { retries?: number; repair?: boolean }
}) => Promise<RS<{ value: unknown; summary: string }>>

vi.mock("@core/messages/api/genObject", () => {
  const defaultImpl: GenObjectMockFn = async () =>
    R.success(
      {
        value: { name: "John Doe", age: 30, email: "john@example.com" },
        summary: "Test summary",
      },
      0.01,
    )
  const genObject = vi.fn<GenObjectMockFn>(defaultImpl)
  return { genObject }
})

// Mock the dependencies
vi.mock("ai", () => ({
  generateText: vi.fn(),
  tool: vi.fn((config: any) => config),
  genObject: vi.fn(),
  stepCountIs: vi.fn((count: number) => ({ type: "stepCount", count })),
  zodSchema: vi.fn((schema: any) => schema),
  APICallError: class APICallError extends Error {
    constructor(message: string) {
      super(message)
      this.name = "APICallError"
    }
  },
}))

vi.mock("@core/clients/openrouterClient", () => ({
  openrouter: vi.fn((model: string) => `mocked-${model}`),
}))

vi.mock("@core/utils/spending/SpendingTracker", () => ({
  SpendingTracker: {
    getInstance: () =>
      ({
        canMakeRequest: () => true,
        addCost: vi.fn(),
      }) satisfies Pick<import("@core/utils/spending/SpendingTracker").SpendingTracker, "canMakeRequest" | "addCost">,
    create: () =>
      ({
        canMakeRequest: () => true,
        addCost: vi.fn(),
      }) satisfies Pick<import("@core/utils/spending/SpendingTracker").SpendingTracker, "canMakeRequest" | "addCost">,
  },
}))

vi.mock("@core/messages/utils/saveResult", () => ({
  saveResultOutput: vi.fn(),
}))

vi.mock("@lucky/tools/definitions/file-saver/save", () => ({
  saveInLoc: vi.fn(),
}))

import { getDefaultModels } from "@core/core-config/coreConfig"
// Import after mocks so modules receive mocked versions
import { genObject } from "@core/messages/api/genObject"
import { sendAI } from "@core/messages/api/sendAI/sendAI"

// TODO: Missing tests for:
// - Schema validation edge cases (nullable, union types)
// - Retry behavior with structured output
// - Performance with large schemas
describe("sendAIRequest with structuredOutput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should use genObject for structured output and return validated data", async () => {
    const testSchema = z.object({
      name: z.string(),
      age: z.number().min(0).max(150),
      email: z.string().email(),
    })

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

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      name: "John Doe",
      age: 30,
      email: "john@example.com",
    })
    expect(result.debug_output).toEqual(
      expect.objectContaining({
        value: {
          name: "John Doe",
          age: 30,
          email: "john@example.com",
        },
        summary: expect.any(String),
      }),
    )
    expect(result.error).toBeNull()
  })

  it("should support array output via array schema", async () => {
    const itemSchema = z.object({
      id: z.string(),
      name: z.string(),
    })

    vi.mocked(genObject).mockResolvedValueOnce(
      R.success(
        {
          value: [
            { id: "1", name: "Item 1" },
            { id: "2", name: "Item 2" },
          ],
          summary: "List summary",
        },
        0.02,
      ),
    )

    const result = await sendAI({
      messages: [
        {
          role: "user",
          content: "Generate a list of items",
        },
      ],
      model: getDefaultModels().default,
      mode: "structured",
      schema: z.array(itemSchema),
    })

    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
    expect(result.data).toEqual([
      { id: "1", name: "Item 1" },
      { id: "2", name: "Item 2" },
    ])
  })

  it("should support enum output via z.enum schema", async () => {
    vi.mocked(genObject).mockResolvedValueOnce(R.success({ value: "action", summary: "Enum summary" }, 0.01))

    const result = await sendAI({
      messages: [
        {
          role: "user",
          content: "Classify this movie genre",
        },
      ],
      model: getDefaultModels().default,
      mode: "structured",
      schema: z.enum(["action", "comedy", "drama", "horror", "sci-fi"]),
    })

    expect(result.success).toBe(true)
    expect(result.data).toBe("action")
  })

  it("should handle genObject errors", async () => {
    const testSchema = z.object({
      name: z.string(),
    })

    // TODO: Only testing generic error - should test specific error types
    // (network errors, validation errors, timeout errors, etc.)
    vi.mocked(genObject).mockRejectedValueOnce(new Error("AI model error"))

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

    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(result.error).toBe("AI model error")
  })
})
