import { ErrorCodes, type InvokeRequest } from "@lucky/shared/contracts/invoke"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { type TransformedInvokeInput, createInvocationInput, transformInvokeInput } from "../lib/mcp-input-transform"

// Mock genShortId to return predictable values
vi.mock("@lucky/shared/client", () => ({
  genShortId: vi.fn(() => "test_short_id"),
}))

describe("transformInvokeInput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should transform valid invoke request with all fields", () => {
    const rpcRequest: InvokeRequest = {
      jsonrpc: "2.0" as const,
      method: "workflow.invoke" as const,
      id: "req_1",
      params: {
        workflow_id: "wf_ver_abc123",
        input: { question: "What is AI?" },
        options: { goal: "Answer the question" },
      },
    }

    const result = transformInvokeInput(rpcRequest)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({
      workflowVersionId: "wf_ver_abc123",
      prompt: "Answer the question",
      workflowId: "mcp_invoke_test_short_id",
      inputData: { question: "What is AI?" },
    })
  })

  it("should use default goal when options.goal is not provided", () => {
    const rpcRequest: InvokeRequest = {
      jsonrpc: "2.0" as const,
      method: "workflow.invoke" as const,
      id: "req_1",
      params: {
        workflow_id: "wf_ver_abc123",
        input: { question: "What is AI?" },
      },
    }

    const result = transformInvokeInput(rpcRequest)

    expect(result.success).toBe(true)
    expect(result.data?.prompt).toBe("Process the provided input")
  })

  it("should reject request with undefined input", () => {
    const rpcRequest: InvokeRequest = {
      jsonrpc: "2.0" as const,
      method: "workflow.invoke" as const,
      id: "req_1",
      params: {
        workflow_id: "wf_ver_abc123",
        input: undefined,
      },
    }

    const result = transformInvokeInput(rpcRequest)

    expect(result.success).toBe(false)
    expect(result.error).toEqual({
      code: ErrorCodes.INVALID_PARAMS,
      message: "Input is required",
    })
  })

  it("should reject request with null input", () => {
    const rpcRequest: InvokeRequest = {
      jsonrpc: "2.0" as const,
      method: "workflow.invoke" as const,
      id: "req_1",
      params: {
        workflow_id: "wf_ver_abc123",
        input: null,
      },
    }

    const result = transformInvokeInput(rpcRequest)

    expect(result.success).toBe(false)
    expect(result.error).toEqual({
      code: ErrorCodes.INVALID_PARAMS,
      message: "Input is required",
    })
  })

  it("should accept empty object as valid input", () => {
    const rpcRequest: InvokeRequest = {
      jsonrpc: "2.0" as const,
      method: "workflow.invoke" as const,
      id: "req_1",
      params: {
        workflow_id: "wf_ver_abc123",
        input: {},
      },
    }

    const result = transformInvokeInput(rpcRequest)

    expect(result.success).toBe(true)
    expect(result.data?.inputData).toEqual({})
  })

  it("should accept array as valid input", () => {
    const rpcRequest: InvokeRequest = {
      jsonrpc: "2.0" as const,
      method: "workflow.invoke" as const,
      id: "req_1",
      params: {
        workflow_id: "wf_ver_abc123",
        input: [1, 2, 3],
      },
    }

    const result = transformInvokeInput(rpcRequest)

    expect(result.success).toBe(true)
    expect(result.data?.inputData).toEqual([1, 2, 3])
  })

  it("should accept string as valid input", () => {
    const rpcRequest: InvokeRequest = {
      jsonrpc: "2.0" as const,
      method: "workflow.invoke" as const,
      id: "req_1",
      params: {
        workflow_id: "wf_ver_abc123",
        input: "simple string input",
      },
    }

    const result = transformInvokeInput(rpcRequest)

    expect(result.success).toBe(true)
    expect(result.data?.inputData).toBe("simple string input")
  })

  it("should accept number as valid input", () => {
    const rpcRequest: InvokeRequest = {
      jsonrpc: "2.0" as const,
      method: "workflow.invoke" as const,
      id: "req_1",
      params: {
        workflow_id: "wf_ver_abc123",
        input: 42,
      },
    }

    const result = transformInvokeInput(rpcRequest)

    expect(result.success).toBe(true)
    expect(result.data?.inputData).toBe(42)
  })

  it("should handle complex nested input data", () => {
    const rpcRequest: InvokeRequest = {
      jsonrpc: "2.0" as const,
      method: "workflow.invoke" as const,
      id: "req_1",
      params: {
        workflow_id: "wf_ver_abc123",
        input: {
          user: {
            name: "John",
            preferences: {
              theme: "dark",
              notifications: true,
            },
          },
          actions: ["read", "write"],
        },
      },
    }

    const result = transformInvokeInput(rpcRequest)

    expect(result.success).toBe(true)
    expect(result.data?.inputData).toEqual({
      user: {
        name: "John",
        preferences: {
          theme: "dark",
          notifications: true,
        },
      },
      actions: ["read", "write"],
    })
  })
})

describe("createInvocationInput", () => {
  it("should create invocation input with mcp-invoke type", () => {
    const transformed: TransformedInvokeInput = {
      workflowVersionId: "wf_ver_abc123",
      prompt: "Answer the question",
      workflowId: "mcp_invoke_xyz",
    }

    const result = createInvocationInput({
      ...transformed,
      inputData: { question: "What is AI?" },
    })

    expect(result).toEqual({
      workflowVersionId: "wf_ver_abc123",
      evalInput: {
        type: "mcp-invoke",
        goal: "Answer the question",
        workflowId: "mcp_invoke_xyz",
        inputData: { question: "What is AI?" },
      },
    })
  })

  it("should not include inputSchema in evalInput", () => {
    const transformed: TransformedInvokeInput = {
      workflowVersionId: "wf_ver_abc123",
      prompt: "Process input",
      workflowId: "mcp_invoke_xyz",
    }

    const result = createInvocationInput({
      ...transformed,
      inputData: { question: "What is AI?" },
    })

    expect(result.evalInput).not.toHaveProperty("inputSchema")
  })

  it("should handle complex input data", () => {
    const transformed: TransformedInvokeInput = {
      workflowVersionId: "wf_ver_abc123",
      prompt: "Process complex data",
      workflowId: "mcp_invoke_xyz",
    }

    const complexInputData = {
      users: [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ],
      metadata: { timestamp: "2024-01-01" },
    }

    const result = createInvocationInput({
      ...transformed,
      inputData: complexInputData,
    })

    expect(result.evalInput.inputData).toEqual(complexInputData)
  })

  it("should preserve goal text exactly", () => {
    const transformed = {
      workflowVersionId: "wf_ver_abc123",
      prompt: "This is a very specific goal with special characters: @#$%",
      workflowId: "mcp_invoke_xyz",
      inputData: {},
    }

    const result = createInvocationInput(transformed)

    expect(result.evalInput.goal).toBe("This is a very specific goal with special characters: @#$%")
  })
})
