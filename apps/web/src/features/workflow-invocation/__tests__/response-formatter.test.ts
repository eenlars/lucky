import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import { describe, expect, it } from "vitest"
import {
  extractTraceId,
  extractWorkflowOutput,
  formatErrorResponse,
  formatInternalError,
  formatSuccessResponse,
  formatWorkflowError,
} from "../lib/response-formatter"

describe("formatSuccessResponse", () => {
  it("should format success response with all metadata", () => {
    const requestId = "req_123"
    const output = { result: "success", data: "test" }
    const meta = {
      requestId: "req_123",
      workflowId: "wf_abc",
      startedAt: "2024-01-01T00:00:00Z",
      finishedAt: "2024-01-01T00:01:00Z",
      traceId: "trace_xyz",
    }

    const response = formatSuccessResponse(requestId, output, meta)

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: requestId,
      result: {
        status: "ok",
        output,
        meta: {
          requestId: "req_123",
          workflow_id: "wf_abc",
          startedAt: "2024-01-01T00:00:00Z",
          finishedAt: "2024-01-01T00:01:00Z",
          traceId: "trace_xyz",
          invocationType: "http",
        },
      },
    })
  })

  it("should handle numeric request ID", () => {
    const requestId = 123
    const output = { result: "success" }
    const meta = {
      requestId: "req_123",
      workflowId: "wf_abc",
      startedAt: "2024-01-01T00:00:00Z",
    }

    const response = formatSuccessResponse(requestId, output, meta)

    expect(response.id).toBe(123)
  })

  it("should include randomId when provided", () => {
    const requestId = "req_123"
    const output = { result: "success" }
    const meta = {
      requestId: "req_123",
      workflowId: "wf_abc",
      startedAt: "2024-01-01T00:00:00Z",
    }
    const randomId = "random_xyz"

    const response = formatSuccessResponse(requestId, output, meta, randomId)

    expect(response.result.meta.randomId).toBe(randomId)
  })

  it("should not include randomId when not provided", () => {
    const requestId = "req_123"
    const output = { result: "success" }
    const meta = {
      requestId: "req_123",
      workflowId: "wf_abc",
      startedAt: "2024-01-01T00:00:00Z",
    }

    const response = formatSuccessResponse(requestId, output, meta)

    expect(response.result.meta).not.toHaveProperty("randomId")
  })

  it("should handle metadata without optional fields", () => {
    const requestId = "req_123"
    const output = { result: "success" }
    const meta = {
      requestId: "req_123",
      workflowId: "wf_abc",
      startedAt: "2024-01-01T00:00:00Z",
    }

    const response = formatSuccessResponse(requestId, output, meta)

    expect(response.result.meta.finishedAt).toBeUndefined()
    expect(response.result.meta.traceId).toBeUndefined()
  })
})

describe("formatErrorResponse", () => {
  it("should format error response with all fields", () => {
    const requestId = "req_123"
    const error = {
      code: ErrorCodes.INVALID_REQUEST,
      message: "Invalid request",
      data: { details: "Missing required field" },
    }

    const response = formatErrorResponse(requestId, error)

    expect(response).toEqual({
      jsonrpc: "2.0",
      id: requestId,
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: "Invalid request",
        data: { details: "Missing required field" },
      },
    })
  })

  it("should handle null request ID", () => {
    const error = {
      code: ErrorCodes.INVALID_REQUEST,
      message: "Invalid request",
    }

    const response = formatErrorResponse(null, error)

    expect(response.id).toBe(null)
  })

  it("should handle error without data field", () => {
    const requestId = "req_123"
    const error = {
      code: ErrorCodes.INTERNAL_ERROR,
      message: "Internal error",
    }

    const response = formatErrorResponse(requestId, error)

    expect(response.error.data).toBeUndefined()
  })

  it("should handle numeric request ID", () => {
    const requestId = 456
    const error = {
      code: ErrorCodes.INVALID_REQUEST,
      message: "Invalid request",
    }

    const response = formatErrorResponse(requestId, error)

    expect(response.id).toBe(456)
  })
})

describe("formatWorkflowError", () => {
  it("should extract error message from error object", () => {
    const requestId = "req_123"
    const errorData = {
      error: "Workflow execution failed: Node timeout",
      details: { nodeId: "node_1" },
    }

    const response = formatWorkflowError(requestId, errorData)

    expect(response.error.code).toBe(ErrorCodes.WORKFLOW_EXECUTION_FAILED)
    expect(response.error.message).toBe("Workflow execution failed: Node timeout")
    expect(response.error.data).toEqual(errorData)
  })

  it("should use default message when error field is missing", () => {
    const requestId = "req_123"
    const errorData = { details: "Some details" }

    const response = formatWorkflowError(requestId, errorData)

    expect(response.error.message).toBe("Workflow execution failed")
    expect(response.error.data).toEqual(errorData)
  })

  it("should handle non-object error data", () => {
    const requestId = "req_123"
    const errorData = "simple error string"

    const response = formatWorkflowError(requestId, errorData)

    expect(response.error.message).toBe("Workflow execution failed")
    expect(response.error.data).toBe("simple error string")
  })

  it("should handle null error data", () => {
    const requestId = "req_123"

    const response = formatWorkflowError(requestId, null)

    expect(response.error.message).toBe("Workflow execution failed")
    expect(response.error.data).toBe(null)
  })
})

describe("formatInternalError", () => {
  it("should extract message from Error instance", () => {
    const requestId = "req_123"
    const error = new Error("Something went wrong")

    const response = formatInternalError(requestId, error)

    expect(response.error.code).toBe(ErrorCodes.INTERNAL_ERROR)
    expect(response.error.message).toBe("Something went wrong")
  })

  it("should use default message for non-Error objects", () => {
    const requestId = "req_123"
    const error = { message: "Not an Error instance" }

    const response = formatInternalError(requestId, error)

    expect(response.error.message).toBe("Internal server error")
  })

  it("should handle null request ID", () => {
    const error = new Error("Test error")

    const response = formatInternalError(null, error)

    expect(response.id).toBe(null)
  })

  it("should handle string errors", () => {
    const requestId = "req_123"

    const response = formatInternalError(requestId, "string error")

    expect(response.error.message).toBe("Internal server error")
  })
})

describe("extractWorkflowOutput", () => {
  it("should extract finalWorkflowOutput from nested structure", () => {
    const result = {
      data: [
        {
          queueRunResult: {
            finalWorkflowOutput: { answer: "42" },
          },
        },
      ],
    }

    const output = extractWorkflowOutput(result)

    expect(output).toEqual({ answer: "42" })
  })

  it("should return data when finalWorkflowOutput is not present", () => {
    const result = {
      data: { answer: "fallback" },
    }

    const output = extractWorkflowOutput(result)

    expect(output).toEqual({ answer: "fallback" })
  })

  it("should handle missing queueRunResult", () => {
    const result = {
      data: [{ someOtherField: "value" }],
    }

    const output = extractWorkflowOutput(result)

    expect(output).toEqual([{ someOtherField: "value" }])
  })

  it("should handle empty result", () => {
    const result = {}

    const output = extractWorkflowOutput(result)

    expect(output).toBeUndefined()
  })
})

describe("extractTraceId", () => {
  it("should extract workflowInvocationId from nested structure", () => {
    const result = {
      data: [
        {
          workflowInvocationId: "trace_xyz123",
        },
      ],
    }

    const traceId = extractTraceId(result)

    expect(traceId).toBe("trace_xyz123")
  })

  it("should return undefined when workflowInvocationId is missing", () => {
    const result = {
      data: [{ someOtherField: "value" }],
    }

    const traceId = extractTraceId(result)

    expect(traceId).toBeUndefined()
  })

  it("should return undefined for empty data array", () => {
    const result = {
      data: [],
    }

    const traceId = extractTraceId(result)

    expect(traceId).toBeUndefined()
  })

  it("should return undefined for empty result", () => {
    const result = {}

    const traceId = extractTraceId(result)

    expect(traceId).toBeUndefined()
  })
})
