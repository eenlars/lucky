import { hashSecret } from "@/lib/api-key-utils"
import { logException } from "@/lib/error-logger"
import { createClient } from "@/lib/supabase/server"
import { extractBearerToken, pickIdempotencyKey } from "@lucky/shared/contracts/invoke"
import type { InvokeRequest } from "@lucky/shared/contracts/invoke"

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
    logException(err, {
      location: "/lib/mcp-invoke/auth",
    })
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
 * Validate bearer token against workflow permissions
 * Checks:
 * 1. Token exists in database and is not revoked
 * 2. Token has access to the specified workflow (via scopes)
 * 3. Returns false if token is invalid or lacks permission
 */
export async function validateBearerToken(bearerToken: string, workflowId: string): Promise<boolean> {
  try {
    // Extract secret from token (format: "alive_<secret>")
    if (!bearerToken.startsWith("alive_")) {
      return false
    }
    const secret = bearerToken.slice(6)
    const secretHash = hashSecret(secret)

    // Use service client to query lockbox schema (bypasses RLS for token validation)
    const supabase = await createClient({ keyType: "service" })

    // Validate token exists and is not revoked
    const { data: keyData, error: keyError } = await supabase
      .schema("lockbox")
      .from("secret_keys")
      .select("clerk_id, scopes, revoked_at")
      .eq("secret_hash", secretHash)
      .is("revoked_at", null)
      .maybeSingle()

    if (keyError || !keyData) {
      return false
    }

    // Validate scopes structure
    if (!keyData.scopes || typeof keyData.scopes !== "object" || Array.isArray(keyData.scopes)) {
      return false
    }

    const scopes = keyData.scopes

    // TypeScript doesn't narrow Json type well, so we validate at runtime
    const isValidScopes = (obj: unknown): obj is Record<string, unknown> => {
      return typeof obj === "object" && obj !== null && !Array.isArray(obj)
    }

    if (!isValidScopes(scopes)) {
      return false
    }

    // Check for universal access
    if ("all" in scopes && scopes.all === true) {
      return true
    }

    // Check for workflow-specific access
    if ("workflows" in scopes && Array.isArray(scopes.workflows)) {
      const workflows = scopes.workflows
      // Validate all elements are strings
      const isStringArray = (arr: unknown[]): arr is string[] => {
        return arr.every(item => typeof item === "string")
      }

      if (isStringArray(workflows)) {
        return workflows.includes(workflowId)
      }
    }

    // No valid scope found
    return false
  } catch (error) {
    logException(error, {
      location: "/lib/mcp-invoke/auth:validateBearerToken",
    })
    return false
  }
}
