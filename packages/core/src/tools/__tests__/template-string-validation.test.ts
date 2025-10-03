import { validateAndCorrectWithSchema } from "@lucky/tools"
import { describe, expect, it } from "vitest"
import { z } from "zod"

describe("Template String Validation", () => {
  // TODO: This test suite only tests that template strings fail validation, but doesn't
  // test any actual correction or handling logic. If AI is generating template strings,
  // the system should either: 1) Prevent AI from generating them, or 2) Handle them gracefully
  it("should detect template string patterns in tool arguments", () => {
    const schema = z.object({
      locationData: z.array(
        z.object({
          name: z.string(),
          address: z.string(),
        }),
      ),
      operation: z.enum(["insertLocations", "getLocations"]),
    })

    // Simulate the exact error we're seeing
    const invalidParams = {
      locationData: "${locations}", // AI generated this instead of actual array
      operation: "insertLocations",
    }

    const result = validateAndCorrectWithSchema("locationDataManager", invalidParams, schema)

    // Should identify this as uncorrectable for now
    expect(result.corrected).toBe(false)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain("Uncorrectable validation issue")
    expect(result.warnings[0]).toContain("locationData")
    // TODO: The test confirms template strings are "uncorrectable" but doesn't test
    // what happens next. Does the tool execution fail? Is there an error message to the AI?
    // This acceptance of failure doesn't help solve the actual problem.
  })

  it("should identify the specific error pattern we're seeing", () => {
    // TODO: This test just confirms Zod rejects the invalid input. It doesn't test
    // any solution or mitigation strategy. What's the point of confirming a known failure?
    const schema = z.object({
      locationData: z.array(z.any()).default([]),
    })

    const invalidParams = {
      locationData: "${locations}",
    }

    const parseResult = schema.safeParse(invalidParams)
    expect(parseResult.success).toBe(false)

    if (!parseResult.success) {
      const issue = parseResult.error.issues[0]
      expect(issue.code).toBe("invalid_type")
      expect(issue.message).toBe("Expected array, received string")
    }
  })

  it("should pass validation with correct array data", () => {
    // TODO: This test only validates the happy path. Missing tests for:
    // 1) What happens when AI generates partial template strings like "${locations[0]}"
    // 2) Mixed valid/invalid data like ["${location1}", {name: "valid", address: "123"}]
    // 3) Other template patterns like "{{locations}}" or "<%= locations %>"
    // 4) How to educate the AI to stop generating template strings
    const schema = z.object({
      locationData: z.array(
        z.object({
          name: z.string(),
          address: z.string(),
        }),
      ),
      operation: z.enum(["insertLocations", "getLocations"]),
    })

    const validParams = {
      locationData: [
        { name: "Restaurant 1", address: "123 Main St" },
        { name: "Restaurant 2", address: "456 Oak Ave" },
      ],
      operation: "insertLocations" as const,
    }

    const result = validateAndCorrectWithSchema("locationDataManager", validParams, schema)

    expect(result.corrected).toBe(false) // No correction needed
    expect(result.warnings).toHaveLength(0)
    expect(result.params).toEqual(validParams)
  })
})
