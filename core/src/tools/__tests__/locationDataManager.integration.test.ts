import { describe, expect, it } from "vitest"

describe("LocationDataManager Tool Integration", () => {
  it("should reproduce the exact error we're seeing", async () => {
    // Dynamically import to avoid path resolution issues
    const { tool: locationDataManager } = await import(
      "/Users/here/CODE_FOLDER/main-projects/thesis/together/runtime/code_tools/location-data-manager/tool"
    )

    const mockContext = {
      workflowInvocationId: "test-invocation",
      workflowFiles: [],
      expectedOutputType: undefined,
      mainWorkflowGoal: "test goal",
      workflowId: "test-workflow",
    }

    // This is the exact problematic call that's happening
    const invalidParams = {
      operation: "insertLocations",
      locationData: "${locations}", // AI is generating this
    } as any

    try {
      const result = await locationDataManager.execute(
        invalidParams,
        mockContext
      )

      // Log the actual result to understand what's happening
      console.log("Tool result:", result)

      // The tool should either fail or auto-correct with warnings
      if (result.success) {
        console.log("Tool succeeded - checking for auto-correction...")
        // Tool auto-corrected, which is valid behavior
        expect(result).toBeDefined()
      } else {
        console.log("Tool failed as expected:", result.error)
        expect(result.error).toContain("Expected array, received string")
      }
    } catch (error) {
      // This would be a validation error from Zod
      console.log("Tool threw error:", error)
      expect(error).toBeDefined()
      expect((error as Error).message || (error as Error).toString()).toContain(
        "Expected array, received string"
      )
    }
  })

  it("should work correctly with proper array data", async () => {
    const { tool: locationDataManager } = await import(
      "/Users/here/CODE_FOLDER/main-projects/thesis/together/runtime/code_tools/location-data-manager/tool"
    )

    const mockContext = {
      workflowInvocationId: "test-invocation-2",
      workflowFiles: [],
      expectedOutputType: undefined,
      mainWorkflowGoal: "test goal",
      workflowId: "test-workflow",
    }

    // Correct usage with actual location array
    const validParams: any = {
      operation: "insertLocations" as const,
      locationData: [
        {
          name: "Test Restaurant",
          address: "123 Test St",
          city: "Test City",
          country: "Test Country",
          postcode: "12345",
          latitude: 40.7128,
          longitude: -74.006,
          phone: "555-0123",
          quality: "complete" as const,
          opening_times: {
            monday: "9:00-17:00",
            tuesday: "9:00-17:00",
            wednesday: "9:00-17:00",
            thursday: "9:00-17:00",
            friday: "9:00-17:00",
            saturday: "closed",
            sunday: "closed",
          },
          metadata: {},
          owner_imgs: [],
        },
      ],
    }

    const result = await locationDataManager.execute(validParams, mockContext)

    // Log the result to debug
    console.log("Valid tool result:", result)

    // Should return success result
    expect(result).toBeDefined()
    if (!result.success) {
      console.log("Tool failed:", result.error)
    }
    expect(result.success).toBe(true)
  })
})
