import { TOOL_TOOLKITS } from "@lucky/examples/definitions/registry-grouped"
import type { CodeToolName, ToolExecutionContext } from "@lucky/tools"
import { codeToolRegistry, registerAllTools, setupCodeToolsForNode } from "@lucky/tools"
import { beforeAll, describe, expect, it } from "vitest"

describe("setupCodeToolsForNode", () => {
  beforeAll(async () => {
    // Ensure registry is populated by registering all tools
    await codeToolRegistry.destroy()
    await registerAllTools(TOOL_TOOLKITS)
  })
  it("should set up the searchGoogleMaps code tool without errors", async () => {
    // Test with a specific tool name defined in codeToolsSetup.ts
    const toolNames: CodeToolName[] = ["searchGoogleMaps", "todoWrite", "todoRead"]

    // Provide proper toolExecutionContext as required by the function
    const mockContext: ToolExecutionContext = {
      workflowInvocationId: "test-invocation-id",
      workflowVersionId: "test-v1",
      workflowFiles: [],
      expectedOutputType: undefined,
      mainWorkflowGoal: "test goal",
      workflowId: "test-workflow-id",
    }

    await expect(setupCodeToolsForNode(toolNames, mockContext)).resolves.toBeTypeOf("object")
    // TODO: This assertion is too weak - almost everything in JS is type "object".
    // Should test the specific structure and properties of the returned tools.

    // Optionally, add more specific assertions
    const tools = await setupCodeToolsForNode(toolNames, mockContext)
    expect(Object.keys(tools).length).toBe(toolNames.length)
    expect(tools).toHaveProperty("searchGoogleMaps")
    expect(tools).toHaveProperty("todoWrite")
    expect(tools).toHaveProperty("todoRead")
    // TODO: Only tests that properties exist, not that they're valid tools.
    // Should test: 1) Each tool has execute function
    //             2) Each tool has proper description
    //             3) Each tool's parameters match expected schema
    //             4) Tools can actually be executed without errors
  })

  it("should return an empty object if no tool names are provided", async () => {
    const tools = await setupCodeToolsForNode([])
    expect(Object.keys(tools).length).toBe(0)
    expect(tools).toEqual({})
    // TODO: This test doesn't provide context, which based on codeToolsSetup.simple.test.ts
    // might cause issues. Should test both with and without context.
    // Also missing tests for: 1) Invalid tool names
    //                        2) Mix of valid/invalid names
    //                        3) Duplicate tool names
    //                        4) Error handling when tool loading fails
  })
})
