import { extractBearerToken, pickIdempotencyKey } from "@lucky/contracts/invoke"
import type { InvokeRequest } from "@lucky/contracts/invoke"

export interface AuthResult {
  success: boolean
  bearerToken?: string
  idempotencyKey?: string
  error?: {
    code: number
    message: string
  }
}

/**
 * Extracts and validates bearer token from headers or request body
 */
export function validateAuth(
  headers: Record<string, string | string[] | undefined>,
  rpcRequest: InvokeRequest,
): AuthResult {
  try {
    const bearerToken = extractBearerToken(headers, rpcRequest.params.auth)
    const idempotencyKey = pickIdempotencyKey(headers, rpcRequest.params.options?.idempotencyKey)

    return {
      success: true,
      bearerToken,
      idempotencyKey,
    }
  } catch (err) {
    return {
      success: false,
      error: {
        code: -32000, // INVALID_AUTH
        message: err instanceof Error ? err.message : "Authentication failed",
      },
    }
  }
}

/**
 * TODO: Validate bearer token against workflow permissions
 * For now this is a placeholder
 */
export async function validateBearerToken(bearerToken: string, _workflowId: string): Promise<boolean> {
  // TODO: Implement actual token validation
  // - Check if token exists in database
  // - Check if token has permission to invoke this workflow
  // - Check if token is not expired
  return bearerToken.length >= 16
}
