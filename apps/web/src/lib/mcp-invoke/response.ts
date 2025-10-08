import { ErrorCodes } from "@lucky/contracts/invoke"
import type { InvocationMetadata } from "./types"

/**
 * Formats successful JSON-RPC response
 */
export function formatSuccessResponse(requestId: string | number, output: unknown, meta: InvocationMetadata) {
  return {
    jsonrpc: "2.0" as const,
    id: requestId,
    result: {
      status: "ok" as const,
      output,
      meta: {
        requestId: meta.requestId,
        workflow_id: meta.workflowId,
        startedAt: meta.startedAt,
        finishedAt: meta.finishedAt,
        traceId: meta.traceId,
        invocationType: "http" as const,
      },
    },
  }
}

/**
 * Formats error JSON-RPC response
 */
export function formatErrorResponse(
  requestId: string | number | null,
  error: {
    code: number
    message: string
    data?: unknown
  },
) {
  return {
    jsonrpc: "2.0" as const,
    id: requestId ?? null,
    error: {
      code: error.code,
      message: error.message,
      data: error.data,
    },
  }
}

/**
 * Formats workflow execution error
 */
export function formatWorkflowError(requestId: string | number, errorData: unknown) {
  return formatErrorResponse(requestId, {
    code: ErrorCodes.WORKFLOW_EXECUTION_FAILED,
    message:
      typeof errorData === "object" && errorData !== null && "error" in errorData
        ? String(errorData.error)
        : "Workflow execution failed",
    data: errorData,
  })
}

/**
 * Formats internal server error
 */
export function formatInternalError(requestId: string | number | null, error: unknown) {
  return formatErrorResponse(requestId, {
    code: ErrorCodes.INTERNAL_ERROR,
    message: error instanceof Error ? error.message : "Internal server error",
  })
}

/**
 * Extracts output from workflow result
 */
export function extractWorkflowOutput(result: any): unknown {
  return result.data?.[0]?.queueRunResult?.finalWorkflowOutput || result.data
}

/**
 * Extracts trace ID from workflow result
 */
export function extractTraceId(result: any): string | undefined {
  return result.data?.[0]?.workflowInvocationId
}
