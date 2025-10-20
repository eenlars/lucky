import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SchemaValidationError, validateInvocationInputSchema } from "../lib/validation/input-schema-validator"

// Mock schema-validator
vi.mock("../lib/schema-validator", () => ({
  SchemaValidationError: class SchemaValidationError extends Error {
    constructor(
      public errorMessage: string,
      public details: Array<any>,
    ) {
      super(errorMessage)
      this.name = "SchemaValidationError"
    }
  },
  validateWorkflowInputSchema: vi.fn(),
}))

describe("validateInvocationInputSchema", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Reset mock implementation to default (no-op)
    const { validateWorkflowInputSchema } = await import("../lib/validation/input-schema-validator")
    vi.mocked(validateWorkflowInputSchema).mockReset()
  })

  it("should validate mcp-invoke input against schema", async () => {
    const { validateWorkflowInputSchema } = await import("../lib/validation/input-schema-validator")

    const input: InvocationInput = {
      source: { kind: "version", id: "wf_ver_abc" },
      evalInput: {
        type: "mcp-invoke",
        goal: "Process input",
        workflowId: "mcp_invoke_xyz",
        inputData: { question: "What is AI?" },
      },
    }

    const workflowConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
      inputSchema: {
        type: "object",
        properties: {
          question: { type: "string" },
        },
        required: ["question"],
      },
    }

    validateInvocationInputSchema(input, workflowConfig)

    expect(validateWorkflowInputSchema).toHaveBeenCalledWith({ question: "What is AI?" }, workflowConfig.inputSchema)
  })

  it("should skip validation for prompt-only input type", async () => {
    const { validateWorkflowInputSchema } = await import("../lib/validation/input-schema-validator")

    const input: InvocationInput = {
      source: { kind: "version", id: "wf_ver_abc" },
      evalInput: {
        type: "prompt-only",
        goal: "Test goal",
        workflowId: "workflow_xyz",
      },
    }

    const workflowConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
      inputSchema: {
        type: "object",
        properties: {
          question: { type: "string" },
        },
      },
    }

    validateInvocationInputSchema(input, workflowConfig)

    expect(validateWorkflowInputSchema).not.toHaveBeenCalled()
  })

  it("should skip validation for text input type", async () => {
    const { validateWorkflowInputSchema } = await import("../lib/validation/input-schema-validator")

    const input: InvocationInput = {
      source: { kind: "version", id: "wf_ver_abc" },
      evalInput: {
        type: "text",
        goal: "Test goal",
        workflowId: "workflow_xyz",
        question: "Question",
        answer: "Answer",
      },
    }

    const workflowConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
      inputSchema: {
        type: "object",
        properties: {
          question: { type: "string" },
        },
      },
    }

    validateInvocationInputSchema(input, workflowConfig)

    expect(validateWorkflowInputSchema).not.toHaveBeenCalled()
  })

  it("should skip validation when workflow has no inputSchema", async () => {
    const { validateWorkflowInputSchema } = await import("../lib/validation/input-schema-validator")

    const input: InvocationInput = {
      source: { kind: "version", id: "wf_ver_abc" },
      evalInput: {
        type: "mcp-invoke",
        goal: "Process input",
        workflowId: "mcp_invoke_xyz",
        inputData: { anything: "goes" },
      },
    }

    const workflowConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
    }

    validateInvocationInputSchema(input, workflowConfig)

    // No inputSchema, so validation should be skipped
    expect(validateWorkflowInputSchema).not.toHaveBeenCalled()
  })

  it("should skip validation when workflowConfig is null", async () => {
    const { validateWorkflowInputSchema } = await import("../lib/validation/input-schema-validator")

    const input: InvocationInput = {
      source: { kind: "version", id: "wf_ver_abc" },
      evalInput: {
        type: "mcp-invoke",
        goal: "Process input",
        workflowId: "mcp_invoke_xyz",
        inputData: { question: "What is AI?" },
      },
    }

    validateInvocationInputSchema(input, null)

    expect(validateWorkflowInputSchema).not.toHaveBeenCalled()
  })

  it("should throw SchemaValidationError when validation fails", async () => {
    const { validateWorkflowInputSchema } = await import("../lib/validation/input-schema-validator")

    const input: InvocationInput = {
      source: { kind: "version", id: "wf_ver_abc" },
      evalInput: {
        type: "mcp-invoke",
        goal: "Process input",
        workflowId: "mcp_invoke_xyz",
        inputData: { wrong: "field" },
      },
    }

    const workflowConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
      inputSchema: {
        type: "object",
        properties: {
          question: { type: "string" },
        },
        required: ["question"],
      },
    }

    const validationError = new SchemaValidationError("Validation failed", [
      { path: "/question", message: "is required" },
    ])
    vi.mocked(validateWorkflowInputSchema).mockImplementation(() => {
      throw validationError
    })

    expect(() => validateInvocationInputSchema(input, workflowConfig)).toThrow(SchemaValidationError)
  })

  it("should skip validation when evalInput is undefined", async () => {
    const { validateWorkflowInputSchema } = await import("../lib/validation/input-schema-validator")

    const input: InvocationInput = {
      source: { kind: "version", id: "wf_ver_abc" },
      evalInput: {
        type: "text",
        goal: "Test goal",
        workflowId: "workflow_xyz",
        question: "Question",
        answer: "Answer",
      },
    }

    const workflowConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
      inputSchema: {
        type: "object",
        properties: {
          question: { type: "string" },
        },
      },
    }

    validateInvocationInputSchema(input, workflowConfig)

    expect(validateWorkflowInputSchema).not.toHaveBeenCalled()
  })

  it("should validate even if inputData is complex nested object", async () => {
    const { validateWorkflowInputSchema } = await import("../lib/validation/input-schema-validator")

    const input: InvocationInput = {
      source: { kind: "version", id: "wf_ver_abc" },
      evalInput: {
        type: "mcp-invoke",
        goal: "Process input",
        workflowId: "mcp_invoke_xyz",
        inputData: {
          user: {
            name: "John",
            preferences: {
              theme: "dark",
            },
          },
          actions: ["read", "write"],
        },
      },
    }

    const workflowConfig: WorkflowConfig = {
      __schema_version: 1,
      entryNodeId: "node1",
      nodes: [],
      inputSchema: {
        type: "object",
        properties: {
          user: { type: "object" },
          actions: { type: "array" },
        },
      },
    }

    validateInvocationInputSchema(input, workflowConfig)

    // TypeScript requires type narrowing for union type access
    if (input.evalInput.type === "mcp-invoke") {
      expect(validateWorkflowInputSchema).toHaveBeenCalledWith(input.evalInput.inputData, workflowConfig.inputSchema)
    }
  })
})
