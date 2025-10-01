import type { ToolExecutionContext } from "@lucky/tools"
import { describe, expect, it } from "vitest"
import contextHandler from "../tool"

describe("contextHandler Tool", () => {
  const mockWorkflowInvocationId = "test-workflow-123"
  const mockToolExecutionContext: ToolExecutionContext = {
    workflowInvocationId: mockWorkflowInvocationId,
    workflowVersionId: "test-v1",
    workflowFiles: [],
    expectedOutputType: undefined,
    mainWorkflowGoal: "test-goal",
    workflowId: "test-workflow-id",
  }

  it("should have correct tool structure", () => {
    expect(contextHandler.name).toBe("contextHandler")
    expect(contextHandler.execute).toBeDefined()
    expect(typeof contextHandler.execute).toBe("function")
  })

  it("should validate required parameters", async () => {
    // Test missing key for get operation
    const result = await contextHandler.execute(
      {
        operation: "get",
        scope: "workflow",
      },
      mockToolExecutionContext,
    )

    expect(result.data?.success).toBe(false)
    expect(result.data?.error).toContain("get operation requires a key")
  })

  it("should handle set operation parameters", async () => {
    // Test missing value for set operation
    const result = await contextHandler.execute(
      {
        operation: "set",
        scope: "workflow",
        key: "test-key",
      },
      {
        workflowInvocationId: mockWorkflowInvocationId,
        workflowVersionId: "test-v1",
        workflowFiles: [],
        expectedOutputType: undefined,
        mainWorkflowGoal: "test-goal",
        workflowId: "test-workflow-id",
      },
    )

    expect(result.data?.success).toBe(false)
    expect(result.data?.error).toContain("set operation requires a value")
  })

  it("should handle list operation", async () => {
    // Test list operation (should work even with empty store)

    const result = await contextHandler.execute(
      {
        operation: "list",
        scope: "workflow",
      },
      mockToolExecutionContext,
    )

    // This might fail with Supabase connection, but should have the right structure
    expect(result.data?.output?.operation).toBe("list")
    expect(result.data?.output?.scope).toBe("workflow")
  })

  it("should handle invalid operations", async () => {
    const result = await contextHandler.execute(
      {
        operation: "invalid" as any,
        scope: "workflow",
      },
      mockToolExecutionContext,
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain("invalid_enum_value")
  })

  it("should support both workflow and node scopes", async () => {
    // Test workflow scope
    const workflowResult = await contextHandler.execute(
      {
        operation: "list",
        scope: "workflow",
      },
      mockToolExecutionContext,
    )
    expect(workflowResult.data?.output?.scope).toBe("workflow")

    // Test node scope
    const nodeResult = await contextHandler.execute(
      {
        operation: "list",
        scope: "node",
      },
      mockToolExecutionContext,
    )
    expect(nodeResult.data?.output?.scope).toBe("node")
  })
})
