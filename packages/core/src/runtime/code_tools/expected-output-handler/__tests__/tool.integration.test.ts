import type { ToolExecutionContext } from "@/core/tools/toolFactory"
import { describe, expect, it } from "vitest"
import { z } from "zod"
import { tool as expectedOutputHandler } from "../tool"

describe("expectedOutputHandler integration tests", () => {
  it("should transform unstructured data to match schema using real LLM", async () => {
    // Define the expected schema
    const recipeSchema = z.object({
      name: z.string(),
      servings: z.number().int().positive(),
      prepTime: z
        .number()
        .int()
        .positive()
        .describe("Preparation time in minutes"),
      ingredients: z
        .array(
          z.object({
            item: z.string(),
            amount: z.string(),
          })
        )
        .min(1),
      instructions: z.array(z.string()).min(1),
    })

    const mockContext: ToolExecutionContext = {
      workflowInvocationId: "test-integration",
      workflowFiles: [],
      expectedOutputType: recipeSchema,
      mainWorkflowGoal: "Transform recipe data",
      workflowId: "test-workflow-id",
    }

    // Unstructured recipe text
    const params = {
      dataToTransform: `
        Chocolate Chip Cookies
        
        This recipe makes about 24 cookies and takes 20 minutes to prepare.
        
        You'll need:
        - 2 cups of flour
        - 1 cup butter
        - 3/4 cup sugar
        - 2 eggs
        - 1 tsp vanilla
        - 1 cup chocolate chips
        
        First, cream the butter and sugar. Then add eggs and vanilla. 
        Mix in the flour gradually. Finally, fold in the chocolate chips.
        Bake at 350°F for 10-12 minutes until golden brown.
      `,
      strictness: "lenient" as const,
    }

    const result = await expectedOutputHandler.execute(params, mockContext)

    // Verify successful transformation
    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()

    if (!result.data) {
      throw new Error("Expected result.data to be defined")
    }

    expect(result.data.tool).toBe("expectedOutputHandler")
    expect(result.data.success).toBe(true)
    expect(result.data.error).toBeNull()

    if (result.data.success && result.data.output) {
      const output = result.data.output as any
      expect(output.name).toContain("Chocolate")
      expect(output.servings).toBe(24)
      expect(output.prepTime).toBe(20)
      expect(output.ingredients.length).toBeGreaterThanOrEqual(6)
      expect(output.instructions.length).toBeGreaterThanOrEqual(3)

      // Check that ingredients have proper structure
      output.ingredients.forEach((ingredient: any) => {
        expect(ingredient).toHaveProperty("item")
        expect(ingredient).toHaveProperty("amount")
        expect(typeof ingredient.item).toBe("string")
        expect(typeof ingredient.amount).toBe("string")
      })

      // Also validate against the schema
      const validation = recipeSchema.safeParse(output)
      expect(validation.success).toBe(true)
    }
  }, 30000)

  it("should handle strict mode and return failure for incompatible data", async () => {
    const strictSchema = z.object({
      id: z.string().uuid(),
      timestamp: z.string().datetime(),
      value: z.number().int(),
    })

    const mockContext: ToolExecutionContext = {
      workflowInvocationId: "test-strict",
      workflowFiles: [],
      expectedOutputType: strictSchema,
      mainWorkflowGoal: "Test strict transformation",
      workflowId: "test-workflow-id",
    }

    const params = {
      dataToTransform:
        "Just some random text that can't possibly match the strict schema requirements",
      strictness: "strict" as const,
    }

    const result = await expectedOutputHandler.execute(params, mockContext)

    // In strict mode, it should either succeed with valid data or return a success: false object
    expect(result.success).toBe(true)
    expect(result.error).toBeNull()
    expect(result.data).not.toBeNull()

    if (!result.data) {
      throw new Error("Expected result.data to be defined")
    }

    expect(result.data.tool).toBe("expectedOutputHandler")

    if (result.data.success && result.data.output) {
      // If it managed to transform, check if it's valid or a failure response
      if (
        "success" in result.data.output &&
        result.data.output.success === false
      ) {
        expect(result.data.output).toHaveProperty("reason")
        expect(typeof result.data.output.reason).toBe("string")
      } else {
        // If it somehow generated valid data, validate it
        const validation = strictSchema.safeParse(result.data.output)
        expect(validation.success).toBe(true)
      }
    }
  }, 30000)
})
