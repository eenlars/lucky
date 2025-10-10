import { genShortId } from "@lucky/shared/client"
import type { InvokeRequest } from "@lucky/shared/contracts/invoke"
import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import type { JsonSchemaDefinition } from "@lucky/shared/contracts/workflow"
import type { TransformedInvokeInput } from "./types"

export interface TransformResult {
  success: boolean
  data?: TransformedInvokeInput & {
    inputData: unknown
    inputSchema?: JsonSchemaDefinition
  }
  error?: {
    code: number
    message: string
  }
}

/**
 * Transforms MCP JSON-RPC invoke request to internal invocation format
 * Now returns structured data for mcp-invoke type
 */
export function transformInvokeInput(rpcRequest: InvokeRequest): TransformResult {
  const { workflow_id, input, options } = rpcRequest.params

  // Validate that we have some input
  if (input === undefined || input === null) {
    return {
      success: false,
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: "Input is required",
      },
    }
  }

  // Generate unique workflow invocation ID
  const workflowId = `mcp_invoke_${genShortId()}`

  // Extract goal (if provided)
  const goal = options?.goal || "Process the provided input"

  return {
    success: true,
    data: {
      workflowVersionId: workflow_id,
      prompt: goal, // Legacy field, kept for compatibility
      workflowId,
      inputData: input,
      inputSchema: undefined, // Will be populated from workflow config later
    },
  }
}

/**
 * Creates the internal invocation input format for the workflow engine
 * Uses mcp-invoke type instead of prompt-only
 *
 * Note: inputSchema validation happens at the API route level using JSON Schema.
 * We don't pass it through to the workflow engine since the input is already validated.
 */
export function createInvocationInput(
  transformed: TransformedInvokeInput & {
    inputData: unknown
    inputSchema?: JsonSchemaDefinition
  },
) {
  return {
    workflowVersionId: transformed.workflowVersionId,
    evalInput: {
      type: "mcp-invoke" as const,
      goal: transformed.prompt,
      workflowId: transformed.workflowId,
      inputData: transformed.inputData,
      // inputSchema omitted - validation already done at API layer
    },
  }
}
