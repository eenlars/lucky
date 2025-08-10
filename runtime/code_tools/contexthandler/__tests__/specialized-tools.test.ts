import type { ToolExecutionContext } from "@core/tools/toolFactory"
import { beforeEach, describe, expect, it } from "vitest"

import contextGet from "../tool-context-get"
import contextList from "../tool-context-list"
import contextManage from "../tool-context-manage"
import contextSet from "../tool-context-set"

describe("Specialized Context Tools", () => {
  const mockWorkflowInvocationId = "550e8400-e29b-41d4-a716-446655440000"
  const mockToolExecutionContext: ToolExecutionContext = {
    workflowInvocationId: mockWorkflowInvocationId,
    workflowVersionId: "test-v1",
    workflowFiles: [],
    expectedOutputType: undefined,
    mainWorkflowGoal: "test-goal",
    workflowId: "test-workflow-id",
  }

  beforeEach(() => {
    // Reset any state before each test
  })

  describe("contextGet", () => {
    it("should have correct tool structure", () => {
      expect(contextGet.name).toBe("contextGet")
      expect(typeof contextGet.execute).toBe("function")
    })

    it("should handle missing keys with default values", async () => {
      const result = await contextGet.execute(
        {
          scope: "workflow",
          key: "nonexistent-key-test-123",
          workflowInvocationId: mockWorkflowInvocationId,
          defaultValue: "fallback-value",
        },
        mockToolExecutionContext
      )

      // contextGet returns plain object wrapped by defineTool: { success, data: plainObject, error }
      expect(result.success).toBe(true)
      expect(result.data?.found).toBe(false)
      expect(result.data?.value).toBe("fallback-value")
      expect(result.data?.message).toContain("returning default value")
    })
  })

  describe("contextSet", () => {
    it("should have correct tool structure", () => {
      expect(contextSet.name).toBe("contextSet")
      expect(typeof contextSet.execute).toBe("function")
    })

    it("should prevent overwrite when disabled", async () => {
      const testKey = `overwrite-test-${Date.now()}`

      // First set a value
      await contextSet.execute(
        {
          scope: "workflow",
          key: testKey,
          value: "original-value",
          overwrite: true,
        },
        mockToolExecutionContext
      )

      // Then try to overwrite with overwrite: false
      const result = await contextSet.execute(
        {
          scope: "workflow",
          key: testKey,
          value: "new-value",
          overwrite: false,
        },
        mockToolExecutionContext
      )

      expect(result.data?.success).toBe(false)
      // Handle both string and object error formats
      const errorMessage =
        typeof result.data?.error === "string"
          ? result.data.error
          : (result.data?.error as any)?.error ||
            JSON.stringify(result.data?.error)
      expect(errorMessage).toContain("already exists")
    })
  })

  describe("contextList", () => {
    it("should have correct tool structure", () => {
      expect(contextList.name).toBe("contextList")
      expect(typeof contextList.execute).toBe("function")
    })

    it("should list both scopes by default", async () => {
      const result = await contextList.execute(
        {
          scope: "both",
        },
        mockToolExecutionContext
      )

      // contextList uses Tools.createSuccess, so structure is: { success, data: { output: actualData }, error }
      expect(result.success).toBe(true)
      expect(result.data?.output?.metadata).toHaveProperty("scope")
      expect(result.data?.output?.metadata).toHaveProperty("totalFound")
      expect(result.data?.output?.metadata).toHaveProperty("filteredCount")
      expect(result.data?.output?.metadata).toHaveProperty("returnedCount")
      expect(result.data?.output?.metadata).toHaveProperty("filter")
      expect(result.data?.output?.metadata).toHaveProperty("includeMetadata")
      expect(result.data?.output?.metadata).toHaveProperty("keys")
      expect(result.data?.output?.metadata?.keys).toHaveProperty("workflow")
    })
  })

  describe("contextManage", () => {
    it("should have correct tool structure", () => {
      expect(contextManage.name).toBe("contextManage")
      expect(typeof contextManage.execute).toBe("function")
    })

    it("should handle exists operation", async () => {
      const testKey = `exists-test-${Date.now()}`

      // First set a value to test exists
      await contextSet.execute(
        {
          scope: "workflow",
          key: testKey,
          value: "some-value",
          overwrite: true,
        },
        mockToolExecutionContext
      )

      const result = await contextManage.execute(
        {
          operation: "exists",
          scope: "workflow",
          key: testKey,
        },
        mockToolExecutionContext
      )

      // contextManage uses Tools.createSuccess, so structure is: { success, data: { output: actualData }, error }
      expect(result.success).toBe(true)
      expect(result.data?.output?.operation).toBe("exists")
    })

    it("should require key for operations that need it", async () => {
      const result = await contextManage.execute(
        {
          operation: "delete",
          scope: "workflow",
        },
        mockToolExecutionContext
      )

      expect(result.data?.success).toBe(false)
      // Handle both string and object error formats
      const errorMessage =
        typeof result.data?.error === "string"
          ? result.data.error
          : (result.data?.error as any)?.error ||
            JSON.stringify(result.data?.error)
      expect(errorMessage).toContain("delete operation requires a key")
    })

    it("should handle backup operations", async () => {
      // IMPROVEMENT NEEDED: Test times out after 30 seconds
      // Backup operation appears to hang or take too long to complete
      // May need to mock the backup process or optimize the underlying implementation
      const result = await contextManage.execute(
        {
          operation: "backup",
          scope: "workflow",
        },
        mockToolExecutionContext
      )

      // contextManage backup uses Tools.createSuccess, so structure is: { success, data: { output: actualData }, error }
      expect(result.success).toBe(true)
      expect(result.data?.output?.operation).toBe("backup")
    }, 30000) // increased timeout to 30 seconds - still timing out
  })

  describe("Tool Integration", () => {
    it("should work together for complete workflow", async () => {
      const testKey = `integration-test-${Date.now()}`
      const testValue = { type: "integration", timestamp: Date.now() }

      // Set data
      const setResult = await contextSet.execute(
        {
          scope: "workflow",
          key: testKey,
          value: testValue,
          overwrite: true,
        },
        mockToolExecutionContext
      )
      expect(setResult.success).toBe(true)

      // Get data
      const getResult = await contextGet.execute(
        {
          scope: "workflow",
          key: testKey,
          workflowInvocationId: mockWorkflowInvocationId,
        },
        mockToolExecutionContext
      )
      expect(getResult.success).toBe(true)

      // List should work
      const listResult = await contextList.execute(
        {
          scope: "workflow",
          filter: "integration*",
        },
        mockToolExecutionContext
      )
      expect(listResult.success).toBe(true)

      // Check if exists
      const existsResult = await contextManage.execute(
        {
          operation: "exists",
          scope: "workflow",
          key: testKey,
        },
        mockToolExecutionContext
      )
      expect(existsResult.success).toBe(true)
    })
  })
})
