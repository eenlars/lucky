import { getDefaultModels } from "@core/core-config/compat"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { describe, expect, it } from "vitest"
import { z } from "zod"

// TODO: These are integration tests that make real API calls - should be excluded from main test suite
// TODO: Add proper test isolation - tests depend on external API availability
// TODO: Add error case testing - what happens when API is down or returns errors?
// TODO: Add timeout testing - tests have 30s timeout but no verification of timeout behavior
describe("sendAIRequest integration tests with expectedOutput", () => {
  it("should successfully validate a simple schema response", async () => {
    // Define a simple schema
    const mathSchema = z.object({
      answer: z.number(),
      explanation: z.string(),
    })

    const { success, data, error } = await sendAI({
      messages: [
        {
          role: "user",
          content: "What is 25 + 17? Provide the answer as a number and a brief explanation.",
        },
      ],
      model: getDefaultModels().default,
      mode: "structured",
      schema: mathSchema,
    })

    // Verify the response
    expect(success).toBe(true)
    expect(data).toBeDefined()
    expect(error).toBeNull()

    if (success) {
      expect(typeof data.answer).toBe("number")
      // TODO: This assertion is too rigid - assumes AI will always calculate 25+17=42
      // Should use more flexible assertions or mock the response
      expect(data.answer).toBe(42)
      expect(typeof data.explanation).toBe("string")
      expect(data.explanation.length).toBeGreaterThan(0)
    }
  }, 30000) // 30 second timeout for API call

  it("should handle complex nested schema", async () => {
    // Define a more complex schema
    const userSchema = z.object({
      user: z.object({
        name: z.string().min(1),
        age: z.number().int().min(18).max(100),
        email: z.string().email(),
        interests: z.array(z.string()).min(1).max(3),
      }),
      metadata: z.object({
        generated: z.boolean(),
        confidence: z.number().min(0).max(1),
      }),
    })

    const {
      success,
      data,
      error: _error,
    } = await sendAI({
      messages: [
        {
          role: "user",
          content:
            "Generate a fictional adult user profile with name, age (18-100), email, and 1-3 interests. Include metadata with generated=true and a confidence score.",
        },
      ],
      model: getDefaultModels().default,
      mode: "structured",
      schema: userSchema,
      output: "object",
    })

    expect(success).toBe(true)

    if (success) {
      // Validate the structure
      expect(data.user).toBeDefined()
      expect(data.user.name).toBeTruthy()
      expect(data.user.age).toBeGreaterThanOrEqual(18)
      expect(data.user.age).toBeLessThanOrEqual(100)
      expect(data.user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      expect(Array.isArray(data.user.interests)).toBe(true)
      expect(data.user.interests.length).toBeGreaterThanOrEqual(1)
      expect(data.user.interests.length).toBeLessThanOrEqual(3)

      expect(data.metadata.generated).toBe(true)
      expect(data.metadata.confidence).toBeGreaterThanOrEqual(0)
      expect(data.metadata.confidence).toBeLessThanOrEqual(1)
    }
  }, 30000)

  it("should handle optional fields correctly", async () => {
    const productSchema = z.object({
      name: z.string(),
      price: z.number().positive(),
      description: z.string().optional(),
      inStock: z.boolean(),
    })

    const { success, data, error } = await sendAI({
      messages: [
        {
          role: "user",
          content:
            "Create a product entry for a coffee mug. Include name, price, and whether it's in stock. Description is optional.",
        },
      ],
      model: getDefaultModels().default,
      mode: "structured",
      schema: productSchema,
      output: "object",
    })

    expect(success).toBe(true)
    expect(data).toBeDefined()
    expect(error).toBeNull()

    if (success) {
      expect(data.name).toBeTruthy()
      expect(data.price).toBeGreaterThan(0)
      expect(typeof data.inStock).toBe("boolean")
      // description might or might not be present
      if (data.description !== undefined) {
        expect(typeof data.description).toBe("string")
      }
    }
  }, 30000)

  it("should work with enum values", async () => {
    const taskSchema = z.object({
      title: z.string(),
      priority: z.enum(["low", "medium", "high"]),
      status: z.enum(["todo", "in-progress", "done"]),
      assignee: z.string().optional(),
    })

    const { success, data, error } = await sendAI({
      messages: [
        {
          role: "user",
          content: "Create a task for reviewing code with high priority, todo status, and no assignee yet.",
        },
      ],
      model: getDefaultModels().default,
      mode: "structured",
      schema: taskSchema,
      output: "object",
    })

    expect(success).toBe(true)
    expect(data).toBeDefined()
    expect(error).toBeNull()

    if (success) {
      expect(data.title).toContain("code")
      expect(data.priority).toBe("high")
      expect(data.status).toBe("todo")
      // Accept both null and undefined for optional fields
      expect(data.assignee === null || typeof data.assignee === "undefined").toBe(true)
    }
  }, 30000)
})
