import type { CodeToolName } from "@core/tools/tool.types"
import type { ToolExecutionContext } from "@core/tools/toolFactory"
import { beforeEach, describe, expect, it } from "vitest"
import { setupCodeToolsForNode } from "../codeToolsSetup"
import { codeToolRegistry } from "../index"

describe("codeToolsSetup bug demonstration", () => {
  beforeEach(async () => {
    // Initialize registry
    await codeToolRegistry.initialize()
  })

  it("shows tools are missing without context", async () => {
    const toolNames: CodeToolName[] = ["todoWrite", "todoRead"]

    // This is what happens in ToolManager.initializeTools()
    const tools = await setupCodeToolsForNode(toolNames)

    console.log("Tools without context:", Object.keys(tools))
    expect(tools).toEqual({})
    expect(Object.keys(tools).length).toBe(0)
  })

  it("shows tools appear with context", async () => {
    const toolNames: CodeToolName[] = ["todoWrite", "todoRead"]
    const context: ToolExecutionContext = {
      workflowInvocationId: "test-123",
      workflowFiles: [],
      expectedOutputType: undefined,
      workflowId: "workflow-123",
      mainWorkflowGoal: "test",
    }

    // This is what happens in ToolManager.getAllTools()
    const tools = await setupCodeToolsForNode(toolNames, context)

    console.log("Tools with context:", Object.keys(tools))
    expect(Object.keys(tools).length).toBe(2)
    expect(tools.todoWrite).toBeDefined()
    expect(tools.todoRead).toBeDefined()
  })

  it("demonstrates the full bug scenario", async () => {
    const toolNames: CodeToolName[] = ["todoWrite", "todoRead"]

    // Step 1: What ToolManager.initializeTools() does
    const toolsFromInit = await setupCodeToolsForNode(toolNames)
    console.log("Step 1 - initializeTools:", Object.keys(toolsFromInit))

    // Step 2: What ToolManager.getAllTools() does
    const context: ToolExecutionContext = {
      workflowInvocationId: "test-456",
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
  })
})
