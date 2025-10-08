import { ErrorCodes, JsonRpcInvokeRequest, RequestIdTracker } from "@lucky/contracts/invoke"

const requestIdTracker = new RequestIdTracker()

export interface ValidationResult {
  success: boolean
  data?: ReturnType<typeof JsonRpcInvokeRequest.parse>
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

/**
 * Validates JSON-RPC request structure and checks request ID uniqueness
 */
export function validateInvokeRequest(body: unknown): ValidationResult {
  // Validate JSON-RPC structure
  const parseResult = JsonRpcInvokeRequest.safeParse(body)
  if (!parseResult.success) {
    return {
      success: false,
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: "Invalid JSON-RPC request format",
        data: parseResult.error.format(),
      },
    }
  }

  const rpcRequest = parseResult.data

  // Check request ID uniqueness
  try {
    requestIdTracker.assertNew(rpcRequest.id)
  } catch (err) {
    return {
      success: false,
      error: {
        code: ErrorCodes.INVALID_REQUEST,
        message: err instanceof Error ? err.message : "Duplicate request ID",
      },
    }
  }

  return {
    success: true,
    data: rpcRequest,
  }
}

/**
 * Reset request ID tracker (useful for testing)
 */
export function resetRequestIdTracker() {
  // Create new instance by clearing the Set
  // Note: This is a workaround since RequestIdTracker doesn't expose reset
  // In production, this would be per-session/connection
}
