import type { Principal } from "@/lib/auth/principal"
import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import { describe, expect, it } from "vitest"
import { InvalidWorkflowInputError, formatInvalidInputResponse, validateWorkflowInput } from "../lib/input-validator"

describe("validateWorkflowInput", () => {
  it("should allow file loading for api_key auth", () => {
    const principal: Principal = {
      auth_method: "api_key",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const filename = "/path/to/workflow.json"

    expect(() => validateWorkflowInput(principal, filename)).not.toThrow()
  })

  it("should allow api_key auth without filename", () => {
    const principal: Principal = {
      auth_method: "api_key",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    expect(() => validateWorkflowInput(principal, undefined)).not.toThrow()
  })

  it("should allow session auth without filename", () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    expect(() => validateWorkflowInput(principal, undefined)).not.toThrow()
  })

  it("should block file loading for session auth", () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const filename = "/path/to/workflow.json"

    expect(() => validateWorkflowInput(principal, filename)).toThrow(InvalidWorkflowInputError)
  })

  it("should throw InvalidWorkflowInputError with correct code and message for session auth with filename", () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    const filename = "/path/to/workflow.json"

    try {
      validateWorkflowInput(principal, filename)
      expect.fail("Should have thrown InvalidWorkflowInputError")
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidWorkflowInputError)
      if (error instanceof InvalidWorkflowInputError) {
        expect(error.code).toBe(ErrorCodes.INVALID_REQUEST)
        expect(error.message).toContain("Loading workflows from file paths is not allowed")
        expect(error.message).toContain("Please use workflow IDs from your dashboard")
      }
    }
  })

  it("should handle empty filename string as falsy (allowed for session)", () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    expect(() => validateWorkflowInput(principal, "")).not.toThrow()
  })

  it("should block non-empty filename for session auth", () => {
    const principal: Principal = {
      auth_method: "session",
      clerk_id: "user_123",
      scopes: ["*"],
    }

    expect(() => validateWorkflowInput(principal, "workflow.json")).toThrow(InvalidWorkflowInputError)
  })
})

describe("formatInvalidInputResponse", () => {
  it("should format InvalidWorkflowInputError as HTTP response", () => {
    const requestId = "req_123"
    const error = new InvalidWorkflowInputError(
      ErrorCodes.INVALID_REQUEST,
      "Loading workflows from file paths is not allowed. Please use workflow IDs from your dashboard.",
    )

    const response = formatInvalidInputResponse(requestId, error)

    expect(response.status).toBe(403)
    expect(response.body).toMatchObject({
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: "Loading workflows from file paths is not allowed. Please use workflow IDs from your dashboard.",
      },
    })
  })

  it("should handle different error codes", () => {
    const requestId = "req_456"
    const error = new InvalidWorkflowInputError(ErrorCodes.WORKFLOW_NOT_FOUND, "Workflow not found")

    const response = formatInvalidInputResponse(requestId, error)

    expect(response.status).toBe(403)
    expect(response.body.error.code).toBe(ErrorCodes.WORKFLOW_NOT_FOUND)
    expect(response.body.error.message).toBe("Workflow not found")
  })

  it("should preserve request ID in response", () => {
    const requestId = "unique_req_789"
    const error = new InvalidWorkflowInputError(ErrorCodes.INVALID_REQUEST, "Invalid input")

    const response = formatInvalidInputResponse(requestId, error)

    expect(response.body.id).toBe(requestId)
  })

  it("should always return 403 status code", () => {
    const error1 = new InvalidWorkflowInputError(ErrorCodes.INVALID_REQUEST, "Message 1")
    const error2 = new InvalidWorkflowInputError(ErrorCodes.WORKFLOW_NOT_FOUND, "Message 2")
    const error3 = new InvalidWorkflowInputError(999, "Message 3")

    expect(formatInvalidInputResponse("req_1", error1).status).toBe(403)
    expect(formatInvalidInputResponse("req_2", error2).status).toBe(403)
    expect(formatInvalidInputResponse("req_3", error3).status).toBe(403)
  })
})

describe("InvalidWorkflowInputError", () => {
  it("should be instance of Error", () => {
    const error = new InvalidWorkflowInputError(400, "Test error")

    expect(error).toBeInstanceOf(Error)
  })

  it("should have correct name", () => {
    const error = new InvalidWorkflowInputError(400, "Test error")

    expect(error.name).toBe("InvalidWorkflowInputError")
  })

  it("should preserve all properties", () => {
    const code = 403
    const message = "Security violation"

    const error = new InvalidWorkflowInputError(code, message)

    expect(error.code).toBe(code)
    expect(error.message).toBe(message)
    expect(error.name).toBe("InvalidWorkflowInputError")
  })
})
