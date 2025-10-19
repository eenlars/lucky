import type { Principal } from "@/lib/auth/principal"
import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import { InvalidWorkflowInputError } from "./errors"
import { formatErrorResponse } from "./response-formatter"

/**
 * Validate workflow invocation input against security and auth constraints.
 *
 * Security rules:
 * - Session-authenticated users can NEVER load workflows from filesystem
 * - Only API key auth (local development) can load from file paths
 *
 * @param principal - Authenticated principal
 * @param filename - Optional filename from input
 * @throws {InvalidWorkflowInputError} If validation fails
 *
 * @example
 * validateWorkflowInput(principal, input.filename)
 * // Throws if session auth attempts file loading
 */
export function validateWorkflowInput(principal: Principal, filename?: string): void {
  // SECURITY: UI users (session auth) should NEVER use filename parameter
  // Only local development (api_key auth) should load from filesystem
  if (principal.auth_method === "session" && filename) {
    console.error("[input-validator] SECURITY: UI user attempted to load workflow from file path:", filename)
    throw new InvalidWorkflowInputError(
      ErrorCodes.INVALID_REQUEST,
      "Loading workflows from file paths is not allowed. Please use workflow IDs from your dashboard.",
    )
  }
}

/**
 * Format InvalidWorkflowInputError as HTTP response
 */
export function formatInvalidInputResponse(
  requestId: string,
  error: InvalidWorkflowInputError,
): {
  body: ReturnType<typeof formatErrorResponse>
  status: number
} {
  return {
    body: formatErrorResponse(requestId, {
      code: error.code,
      message: error.message,
    }),
    status: 403,
  }
}

// Re-export error type
export { InvalidWorkflowInputError }
