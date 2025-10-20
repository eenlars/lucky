import { ErrorCodes, JsonRpcInvokeRequest } from "@lucky/shared/contracts/invoke"

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
 * Validates JSON-RPC request structure
 * Note: Does not enforce request ID uniqueness since HTTP requests are stateless.
 * Each HTTP request is an independent JSON-RPC session.
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

  return {
    success: true,
    data: parseResult.data,
  }
}
