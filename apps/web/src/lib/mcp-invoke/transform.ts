import { ErrorCodes } from "@lucky/contracts/invoke"
import type { InvokeRequest } from "@lucky/contracts/invoke"
import { genShortId } from "@lucky/shared/client"
import type { TransformedInvokeInput } from "./types"

export interface TransformResult {
  success: boolean
  data?: TransformedInvokeInput
  error?: {
    code: number
    message: string
  }
}

/**
 * Transforms MCP JSON-RPC invoke request to internal invocation format
 */
export function transformInvokeInput(rpcRequest: InvokeRequest): TransformResult {
  const { workflow_id, input, options } = rpcRequest.params

  // Extract prompt from input
  let prompt: string
  if (typeof input === "string") {
    prompt = input
  } else if (options?.goal) {
    prompt = options.goal
  } else if (typeof input === "object" && input !== null) {
    // TODO: In future, validate input against workflow's JSON Schema
    // For now, just stringify it
    prompt = JSON.stringify(input)
  } else {
    return {
      success: false,
      error: {
        code: ErrorCodes.INVALID_PARAMS,
        message: "Input must be a string, object, or options.goal must be provided",
      },
    }
  }

  // Generate unique workflow invocation ID
  const workflowId = `mcp_invoke_${genShortId()}`

  return {
    success: true,
    data: {
      workflowVersionId: workflow_id,
      prompt,
      workflowId,
    },
  }
}

/**
 * Creates the internal invocation input format for the workflow engine
 */
export function createInvocationInput(transformed: TransformedInvokeInput) {
  return {
    workflowVersionId: transformed.workflowVersionId,
    evalInput: {
      type: "prompt-only" as const,
      goal: transformed.prompt,
      workflowId: transformed.workflowId,
    },
  }
}
