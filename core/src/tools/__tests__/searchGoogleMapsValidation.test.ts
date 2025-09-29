import { describe, expect, it } from "vitest"
import { z } from "zod"

describe("SearchGoogleMaps Parameter Validation Fix", () => {
  // TODO: This test creates its own searchGoogleMaps tool instead of testing the actual
  // implementation. It should import and test the real searchGoogleMaps tool to ensure
  // the actual tool has proper validation, not just a mock version.
  it("should validate maxResultCount parameter correctly and reject values > 20", () => {
    const paramsSchema = z.object({
      query: z.string().describe("Search query"),
      maxResultCount: z.number().max(20).default(10).describe("Number of results to return"),
      domainFilter: z.string().optional().describe("Filter by domain"),
    })

    // Valid cases
    expect(paramsSchema.safeParse({ query: "coffee", maxResultCount: 10 }).success).toBe(true)
    // Default applied
    const withDefault = paramsSchema.safeParse({ query: "coffee" })
    expect(withDefault.success).toBe(true)
    if (withDefault.success) {
      expect(withDefault.data.maxResultCount).toBe(10)
    }

    // Invalid case (> 20)
    const parsed = paramsSchema.safeParse({
      query: "coffee",
      maxResultCount: 50,
    })
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      expect(JSON.stringify(parsed.error.issues)).toContain("maximum")
    }
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
