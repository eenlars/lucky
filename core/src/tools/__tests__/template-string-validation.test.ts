import { describe, expect, it } from "vitest"
import { z } from "zod"
import { validateAndCorrectWithSchema } from "../constraintValidation"

describe("Template String Validation", () => {
  it("should detect template string patterns in tool arguments", () => {
    const schema = z.object({
      locationData: z.array(
        z.object({
          name: z.string(),
          address: z.string(),
        })
      ),
      operation: z.enum(["insertLocations", "getLocations"]),
    })

    // Simulate the exact error we're seeing
    const invalidParams = {
      locationData: "${locations}", // AI generated this instead of actual array
      operation: "insertLocations",
    }

    const result = validateAndCorrectWithSchema(
      "locationDataManager",
      invalidParams,
      schema
    )

    // Should identify this as uncorrectable for now
    expect(result.corrected).toBe(false)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain("Uncorrectable validation issue")
    expect(result.warnings[0]).toContain("locationData")
  })

  it("should identify the specific error pattern we're seeing", () => {
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
    const schema = z.object({
      locationData: z.array(
        z.object({
          name: z.string(),
          address: z.string(),
        })
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

    const result = validateAndCorrectWithSchema(
      "locationDataManager",
      validParams,
      schema
    )

    expect(result.corrected).toBe(false) // No correction needed
    expect(result.warnings).toHaveLength(0)
    expect(result.params).toEqual(validParams)
  })
})
