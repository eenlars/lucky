import { setupCodeToolsForNode } from "@core/tools/code/codeToolsSetup"
import type { CodeToolName } from "@core/tools/tool.types"
import type { ToolExecutionContext } from "@core/tools/toolFactory"
import { describe, expect, it } from "vitest"

describe("setupCodeToolsForNode", () => {
  it("should set up the searchGoogleMaps code tool without errors", async () => {
    // Test with a specific tool name defined in codeToolsSetup.ts
    const toolNames: CodeToolName[] = [
      "searchGoogleMaps",
      "todoWrite",
      "todoRead",
    ]

    // Provide proper toolExecutionContext as required by the function
    const mockContext: ToolExecutionContext = {
      workflowInvocationId: "test-invocation-id",
      workflowVersionId: "test-v1",
      workflowFiles: [],
      expectedOutputType: undefined,
      mainWorkflowGoal: "test goal",
      workflowId: "test-workflow-id",
    }

    await expect(
      setupCodeToolsForNode(toolNames, mockContext)
    ).resolves.toBeTypeOf("object")

    // Optionally, add more specific assertions
    const tools = await setupCodeToolsForNode(toolNames, mockContext)
    expect(Object.keys(tools).length).toBe(toolNames.length)
    expect(tools).toHaveProperty("searchGoogleMaps")
    expect(tools).toHaveProperty("todoWrite")
    expect(tools).toHaveProperty("todoRead")
  })

  it("should return an empty object if no tool names are provided", async () => {
    const tools = await setupCodeToolsForNode([])
    expect(Object.keys(tools).length).toBe(0)
    expect(tools).toEqual({})
  })
})
