import { tool as locationDataManager } from "@lucky/examples/definitions/location-data-manager/tool"
import { codeToolRegistry } from "@lucky/tools"
import { beforeEach, describe, expect, it } from "vitest"

describe("LocationDataManager Tool Integration", () => {
  // TODO: This test imports a tool from an absolute path instead of using the proper tool registry.
  // It should test through the actual tool discovery/registry system to ensure the tool is properly
  // integrated. Also, the absolute path import makes this test brittle and environment-specific.

  beforeEach(async () => {
    await codeToolRegistry.destroy()
    // @ts-expect-error - TODO: fix this
    codeToolRegistry.register(locationDataManager)
    await codeToolRegistry.initialize()
  })

  it("should reproduce the exact error we're seeing", async () => {
    // Get the registered tool
    const tool = codeToolRegistry.getAllTools().find(t => t.name === "locationDataManager")!

    const mockContext = {
      workflowInvocationId: "test-invocation",
      workflowVersionId: "test-v1",
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
      const result = await tool.execute(invalidParams, mockContext)

      // Log the actual result to understand what's happening
      console.log("Tool result:", result)
      // TODO: Using console.log for debugging in tests is not ideal. Tests should have clear
      // assertions without relying on manual log inspection.

      // The tool should either fail or auto-correct with warnings
      if (result.success) {
        console.log("Tool succeeded - checking for auto-correction...")
        // Tool auto-corrected, which is valid behavior
        expect(result).toBeDefined()
        // TODO: This assertion is too weak - expect(result).toBeDefined() doesn't test anything meaningful.
        // Should verify: 1) What auto-correction happened, 2) If warnings were generated,
        // 3) What the corrected parameters look like
      } else {
        console.log("Tool failed as expected:", result.error)
        expect(result.error).toContain("Expected array, received string")
      }
    } catch (error) {
      // This would be a validation error from Zod
      console.log("Tool threw error:", error)
      expect(error).toBeDefined()
      // TODO: This test doesn't know what behavior to expect - it accepts both success AND failure.
      // A good test should have a clear expectation. Either the tool should validate and reject,
      // or it should auto-correct. Testing both outcomes makes this test non-deterministic.
      expect((error as Error).message || (error as Error).toString()).toContain("Expected array, received string")
    }
  })

  it("should work correctly with proper array data", async () => {
    // Get the registered tool
    const tool = codeToolRegistry.getAllTools().find(t => t.name === "locationDataManager")!

    const mockContext = {
      workflowInvocationId: "test-invocation-2",
      workflowVersionId: "test-v1",
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

    const result = await tool.execute(validParams, mockContext)

    // Log the result to debug
    console.log("Valid tool result:", result)
    // TODO: More console.log debugging - tests should assert specific behavior

    // Should return success result
    expect(result).toBeDefined()
    if (!result.success) {
      console.log("Tool failed:", result.error)
    }
    expect(result.success).toBe(true)
    // TODO: This test only verifies success=true but doesn't test what the tool actually did.
    // Should verify: 1) Locations were stored correctly, 2) Return value structure,
    // 3) Side effects (file creation, database updates, etc.)
  })
})
