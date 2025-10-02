import * as fs from "node:fs/promises"
import * as path from "node:path"
import { PATHS } from "@lucky/tools/config/runtime"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { tool as humanApproval } from "../tool"

const APPROVAL_STORAGE_PATH = path.join(PATHS.node.logging, "approvals")

describe("humanApproval tool", () => {
  beforeEach(async () => {
    // ensure clean test environment
    await fs.mkdir(APPROVAL_STORAGE_PATH, { recursive: true })
  })

  afterEach(async () => {
    // cleanup test files
    try {
      const files = await fs.readdir(APPROVAL_STORAGE_PATH)
      for (const file of files) {
        if (file.endsWith(".json")) {
          await fs.unlink(path.join(APPROVAL_STORAGE_PATH, file))
        }
      }
    } catch (_error) {
      // ignore cleanup errors
    }
  })

  it("should have correct tool configuration", () => {
    expect(humanApproval.name).toBe("humanApproval")
    expect(humanApproval.execute).toBeDefined()
  })

  it("should validate required parameters", async () => {
    // PARAMETER VALIDATION ISSUE: Tool doesn't validate required parameters properly
    // The execute function should throw when 'message' parameter is missing
    // Currently returns undefined instead of throwing an error
    const invalidParams = {} // missing required message

    await expect(async () => {
      await humanApproval.execute(invalidParams as any, {
        workflowInvocationId: "test-workflow",
        workflowVersionId: "test-v1",
        workflowFiles: [],
        expectedOutputType: undefined,
        mainWorkflowGoal: "test goal",
        workflowId: "test-id",
      })
    }).rejects.toThrow()
  })

  it("should create approval request file", async () => {
    const params = {
      message: "Please approve this test",
      timeoutSeconds: 1, // short timeout for testing
    }

    const context = {
      workflowInvocationId: "test-workflow-123",
      workflowVersionId: "test-v1",
      workflowFiles: [],
      expectedOutputType: undefined,
      mainWorkflowGoal: "test goal",
      workflowId: "test-id",
    }

    // start approval (will timeout quickly)
    const resultPromise = humanApproval.execute(params, context)

    // give it time to create the file
    await new Promise(resolve => setTimeout(resolve, 100))

    // check that approval file was created
    const files = await fs.readdir(APPROVAL_STORAGE_PATH)
    const approvalFiles = files.filter(f => f.endsWith(".json"))
    expect(approvalFiles.length).toBe(1)

    // read the approval request
    const requestData = await fs.readFile(path.join(APPROVAL_STORAGE_PATH, approvalFiles[0]), "utf-8")
    const request = JSON.parse(requestData)

    expect(request.workflowInvocationId).toBe("test-workflow-123")
    expect(request.message).toBe("Please approve this test")
    expect(request.status).toBe("pending")

    // TIMEOUT BEHAVIOR ISSUE: Tool doesn't timeout as expected
    // Test expects result.success to be false after 1 second timeout
    // But tool implementation likely returns success=true even on timeout
    const result = await resultPromise
    expect(result.success).toBe(false)
    expect(result.error).toContain("timeout")
    expect(result.data).toBe(null)
  })

  it("should handle approval response", async () => {
    const params = {
      message: "Please approve this action",
      options: ["Option A", "Option B"],
      timeoutSeconds: 5,
    }

    const context = {
      workflowInvocationId: "test-workflow-456",
      workflowVersionId: "test-v1",
      workflowFiles: [],
      expectedOutputType: undefined,
      mainWorkflowGoal: "test goal",
      workflowId: "test-id",
    }

    // start approval
    const resultPromise = humanApproval.execute(params, context)

    // wait for file creation
    await new Promise(resolve => setTimeout(resolve, 100))

    // find and update the approval file
    const files = await fs.readdir(APPROVAL_STORAGE_PATH)
    const approvalFile = files.find(f => f.endsWith(".json"))
    expect(approvalFile).toBeDefined()

    const filePath = path.join(APPROVAL_STORAGE_PATH, approvalFile!)
    const requestData = await fs.readFile(filePath, "utf-8")
    const request = JSON.parse(requestData)

    // simulate approval
    request.status = "approved"
    request.response = "Option A selected"
    await fs.writeFile(filePath, JSON.stringify(request, null, 2))

    // RESPONSE FORMAT MISMATCH: Tool returns extra fields in result.data
    // Test expects only {approved: true, response: "Option A selected"}
    // But tool returns {approvalId, approved, response} causing objectContaining to fail
    const result = await resultPromise
    expect(result.success).toBe(true)
    expect(result.data).toEqual(
      expect.objectContaining({
        approved: true,
        response: "Option A selected",
      }),
    )
  })
})
