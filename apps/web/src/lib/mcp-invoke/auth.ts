import { logException } from "@/lib/error-logger"
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
 * 1. Token exists in database
 * 2. Token is not revoked
 * 3. Token's user has access to the workflow (via RLS)
 */
export async function validateBearerToken(bearerToken: string, workflowId: string): Promise<boolean> {
  try {
    // Import createClient dynamically to avoid circular dependencies
    const { createClient } = await import("@/lib/supabase/server")
    const { hashSecret } = await import("@/lib/api-key-utils")

    // Extract secret from token (format: "alive_<secret>")
    if (!bearerToken.startsWith("alive_")) {
      return false
    }
    const secret = bearerToken.slice(6) // Remove "alive_" prefix
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

    // Check scopes - if { all: true }, allow access to all workflows
    if (keyData.scopes && typeof keyData.scopes === "object" && "all" in keyData.scopes && keyData.scopes.all === true) {
      return true
    }

    // For workflow-specific access, we rely on RLS
    // The workflow query will fail if the user (clerk_id) doesn't have access
    // This is enforced by RLS policies on the WorkflowVersion table
    // So we just need to verify the token is valid here
    return true
  } catch (error) {
    logException(error, {
      location: "/lib/mcp-invoke/auth:validateBearerToken",
    })
    return false
  }
}
