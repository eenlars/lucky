import { TOOL_GROUPS } from "@lucky/examples/definitions/registry-grouped"
import type { CodeToolName, ToolExecutionContext } from "@lucky/tools"
import { registerAllTools } from "@lucky/tools"
import { codeToolRegistry } from "@lucky/tools"
import { beforeEach, describe, expect, it } from "vitest"
import { setupCodeToolsForNode } from "../codeToolsSetup"

describe("codeToolsSetup bug demonstration", () => {
  // TODO: This test suite is labeled as "bug demonstration" which suggests it's testing
  // known broken behavior. Tests should verify correct behavior, not document bugs.
  // If this is a regression test, it should be named accordingly and test the fix.
  beforeEach(async () => {
    // Reset and register all tools
    await codeToolRegistry.destroy()
    await registerAllTools(TOOL_GROUPS)
  })

  it("shows tools are missing without context", async () => {
    const toolNames: CodeToolName[] = ["todoWrite", "todoRead"]

    // This is what happens in ToolManager.initializeTools()
    const tools = await setupCodeToolsForNode(toolNames)

    console.log("Tools without context:", Object.keys(tools))
    expect(tools).toEqual({})
    expect(Object.keys(tools).length).toBe(0)
    // TODO: If this is expected behavior (tools require context), the test name is misleading.
    // It says "tools are missing" like it's a bug, but then expects it to be empty.
    // Is this a bug or intended behavior?
  })

  it("shows tools appear with context", async () => {
    const toolNames: CodeToolName[] = ["todoWrite", "todoRead"]
    const context: ToolExecutionContext = {
      workflowInvocationId: "test-123",
      workflowVersionId: "test-v1",
      workflowFiles: [],
      expectedOutputType: undefined,
      workflowId: "workflow-123",
      mainWorkflowGoal: "test",
    }

    // This is what happens in ToolManager.getAllTools()
    const tools = await setupCodeToolsForNode(toolNames, context)

    console.log("Tools with context:", Object.keys(tools))
    // TODO: Console.log for debugging instead of proper test assertions
    expect(Object.keys(tools).length).toBe(2)
    expect(tools.todoWrite).toBeDefined()
    expect(tools.todoRead).toBeDefined()
  })

  it("demonstrates the full bug scenario", async () => {
    const toolNames: CodeToolName[] = ["todoWrite", "todoRead"]

    // Step 1: What ToolManager.initializeTools() does
    const toolsFromInit = await setupCodeToolsForNode(toolNames)
    console.log("Step 1 - initializeTools:", Object.keys(toolsFromInit))
    // TODO: More console.log debugging

    // Step 2: What ToolManager.getAllTools() does
    const context: ToolExecutionContext = {
      workflowInvocationId: "test-456",
      workflowVersionId: "test-v1",
      workflowFiles: [],
      expectedOutputType: undefined,
      workflowId: "workflow-456",
      mainWorkflowGoal: "test",
    }
    const toolsFromGetAll = await setupCodeToolsForNode(toolNames, context)
    console.log("Step 2 - getAllTools:", Object.keys(toolsFromGetAll))

    // The bug: Same tool names, different results!
    expect(toolsFromInit).toEqual({})
    expect(Object.keys(toolsFromGetAll).length).toBe(2)
    // TODO: This test documents inconsistent behavior but doesn't test a solution.
    // If context is required, the API should either:
    // 1) Make context mandatory (TypeScript parameter)
    // 2) Throw an error when context is missing
    // 3) Return a clear error object
    // Simply returning an empty object is a poor API design.
  })
})
