import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import { describe, expect, it } from "vitest"
import { validateInvokeRequest } from "../lib/json-rpc-validation"

describe("validateInvokeRequest", () => {
  it("should validate correct JSON-RPC request", () => {
    const validRequest = {
      jsonrpc: "2.0",
      method: "workflow.invoke",
      id: "req_123",
      params: {
        workflow_id: "wf_ver_abc",
        input: { question: "test" },
      },
    }

    const result = validateInvokeRequest(validRequest)

    expect(result.success).toBe(true)
    expect(result.data).toEqual(validRequest)
    expect(result.error).toBeUndefined()
  })

  it("should validate request with numeric ID", () => {
    const validRequest = {
      jsonrpc: "2.0",
      method: "workflow.invoke",
      id: 123,
      params: {
        workflow_id: "wf_ver_abc",
        input: { question: "test" },
      },
    }

    const result = validateInvokeRequest(validRequest)

    expect(result.success).toBe(true)
    expect(result.data?.id).toBe(123)
  })

  it("should validate request with options", () => {
    const validRequest = {
      jsonrpc: "2.0",
      method: "workflow.invoke",
      id: "req_123",
      params: {
        workflow_id: "wf_ver_abc",
        input: { question: "test" },
        options: { goal: "Answer the question" },
      },
    }

    const result = validateInvokeRequest(validRequest)

    expect(result.success).toBe(true)
    expect(result.data?.params.options?.goal).toBe("Answer the question")
  })

  it("should reject request with missing jsonrpc", () => {
    const invalidRequest = {
      method: "workflow.invoke",
      id: "req_123",
      params: {
        workflow_id: "wf_ver_abc",
        input: { question: "test" },
      },
    }

    const result = validateInvokeRequest(invalidRequest)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INVALID_REQUEST)
    expect(result.error?.message).toBe("Invalid JSON-RPC request format")
    expect(result.error?.data).toBeDefined()
  })

  it("should reject request with wrong jsonrpc version", () => {
    const invalidRequest = {
      jsonrpc: "1.0",
      method: "workflow.invoke",
      id: "req_123",
      params: {
        workflow_id: "wf_ver_abc",
        input: { question: "test" },
      },
    }

    const result = validateInvokeRequest(invalidRequest)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INVALID_REQUEST)
  })

  it("should reject request with missing method", () => {
    const invalidRequest = {
      jsonrpc: "2.0",
      id: "req_123",
      params: {
        workflow_id: "wf_ver_abc",
        input: { question: "test" },
      },
    }

    const result = validateInvokeRequest(invalidRequest)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INVALID_REQUEST)
  })

  it("should reject request with wrong method", () => {
    const invalidRequest = {
      jsonrpc: "2.0",
      method: "other_method",
      id: "req_123",
      params: {
        workflow_id: "wf_ver_abc",
        input: { question: "test" },
      },
    }

    const result = validateInvokeRequest(invalidRequest)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INVALID_REQUEST)
  })

  it("should reject request with missing params", () => {
    const invalidRequest = {
      jsonrpc: "2.0",
      method: "workflow.invoke",
      id: "req_123",
    }

    const result = validateInvokeRequest(invalidRequest)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INVALID_REQUEST)
  })

  it("should reject request with missing workflow_id", () => {
    const invalidRequest = {
      jsonrpc: "2.0",
      method: "workflow.invoke",
      id: "req_123",
      params: {
        input: { question: "test" },
      },
    }

    const result = validateInvokeRequest(invalidRequest)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INVALID_REQUEST)
  })

  it("should allow request with missing input", () => {
    const validRequest = {
      jsonrpc: "2.0",
      method: "workflow.invoke",
      id: "req_123",
      params: {
        workflow_id: "wf_ver_abc",
      },
    }

    const result = validateInvokeRequest(validRequest)

    expect(result.success).toBe(true)
  })

  it("should allow request with null input", () => {
    const validRequest = {
      jsonrpc: "2.0",
      method: "workflow.invoke",
      id: "req_123",
      params: {
        workflow_id: "wf_ver_abc",
        input: null,
      },
    }

    const result = validateInvokeRequest(validRequest)

    expect(result.success).toBe(true)
  })

  it("should reject non-object request", () => {
    const invalidRequest = "not an object"

    const result = validateInvokeRequest(invalidRequest)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INVALID_REQUEST)
  })

  it("should reject null request", () => {
    const result = validateInvokeRequest(null)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INVALID_REQUEST)
  })

  it("should reject undefined request", () => {
    const result = validateInvokeRequest(undefined)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INVALID_REQUEST)
  })

  it("should reject array request", () => {
    const invalidRequest = [1, 2, 3]

    const result = validateInvokeRequest(invalidRequest)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ErrorCodes.INVALID_REQUEST)
  })

  it("should include zod error details in error data", () => {
    const invalidRequest = {
      jsonrpc: "2.0",
      method: "workflow.invoke",
      id: "req_123",
      params: {},
    }

    const result = validateInvokeRequest(invalidRequest)

    expect(result.success).toBe(false)
    expect(result.error?.data).toBeDefined()
    expect(result.error?.data).toHaveProperty("_errors")
  })
})
