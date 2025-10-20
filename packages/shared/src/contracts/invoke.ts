import { z } from "zod"

/* JSON-RPC primitives */
export const JsonRpcId = z.union([
  z.string().min(1),
  z.number().int().refine(Number.isSafeInteger, "id must be a safe integer"),
])

/* Optional options */
export const InvokeOptions = z
  .object({
    goal: z.string().max(2000).optional(),
    timeoutMs: z
      .number()
      .int()
      .positive()
      .max(10 * 60 * 1000)
      .optional(),
    trace: z.boolean().optional(),
    idempotencyKey: z.string().min(8).max(256).optional(),
  })
  .strict()

/* Request schema (MCP-compliant) */
export const JsonRpcInvokeRequest = z
  .object({
    jsonrpc: z.literal("2.0"),
    id: JsonRpcId, // must NOT be null
    method: z.literal("workflow.invoke"),
    params: z
      .object({
        workflow_id: z.string().min(1, "workflow_id is required"),
        input: z.unknown(), // validated later by AJV
        options: InvokeOptions.optional(),
        auth: z
          .object({ bearer: z.string().min(16) })
          .strict()
          .optional(), // MCP fallback
      })
      .strict(),
  })
  .strict()

export type InvokeRequest = z.infer<typeof JsonRpcInvokeRequest>

/* Response schemas */
export const JsonRpcInvokeSuccess = z
  .object({
    jsonrpc: z.literal("2.0"),
    id: JsonRpcId, // must echo the request id
    result: z
      .object({
        status: z.literal("ok"),
        output: z.unknown(),
        meta: z
          .object({
            requestId: z.string().min(1).optional(),
            workflow_id: z.string().min(1).optional(),
            startedAt: z.string().datetime().optional(),
            finishedAt: z.string().datetime().optional(),
            traceId: z.string().min(1).optional(),
            invocationType: z.enum(["http", "mcp"]).optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
  })
  .strict()

export const JsonRpcInvokeError = z
  .object({
    jsonrpc: z.literal("2.0"),
    id: z.union([JsonRpcId, z.null()]), // JSON-RPC 2.0 allows null when request id is unknown (e.g., parse errors)
    error: z
      .object({
        code: z.number().int(), // integer
        message: z.string().min(1),
        data: z.unknown().optional(),
      })
      .strict(),
  })
  .strict()

export const JsonRpcInvokeResponse = z.union([JsonRpcInvokeSuccess, JsonRpcInvokeError])
export type InvokeResponse = z.infer<typeof JsonRpcInvokeResponse>

/* Runtime checks schema can't enforce */
export class RequestIdTracker {
  private seen = new Set<string>()
  assertNew(id: string | number) {
    const key = `${typeof id}:${String(id)}`
    if (this.seen.has(key)) throw new Error("Request id already used in this session")
    this.seen.add(key)
  }
}

const AuthHeaderRegex = /^Bearer\s+([A-Za-z0-9._~\-+/=]{16,})$/

export function extractBearerToken(
  headers: Record<string, string | string[] | undefined>,
  bodyAuth?: { bearer?: string },
): string {
  const raw = (headers.authorization || headers.Authorization) as string | undefined
  if (raw) {
    const m = raw.match(AuthHeaderRegex)
    if (!m) {
      throw new Error(
        "Invalid Authorization header format. Expected: 'Bearer <token>' where token is at least 16 characters",
      )
    }
    return m[1]!
  }
  if (bodyAuth?.bearer) {
    if (bodyAuth.bearer.length < 16) {
      throw new Error("Bearer token must be at least 16 characters long")
    }
    return bodyAuth.bearer
  }
  throw new Error(
    "Missing authentication. Provide either Authorization header ('Bearer <token>') or params.auth.bearer field",
  )
}

export function pickIdempotencyKey(
  headers: Record<string, string | string[] | undefined>,
  optionsKey?: string,
): string | undefined {
  const hk = (headers["idempotency-key"] || headers["Idempotency-Key"]) as string | undefined
  const key = hk ?? optionsKey
  if (!key) return undefined
  if (key.length < 8 || key.length > 256) {
    throw new Error("Idempotency-Key must be between 8 and 256 characters")
  }
  return key
}

/**
 * JSON-RPC 2.0 error codes
 * Standard codes: -32700 to -32603
 * Application codes: -32000 to -32099
 */
export const ErrorCodes = {
  // Standard JSON-RPC 2.0 errors
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,

  // Application-specific errors
  INVALID_AUTH: -32000,
  WORKFLOW_NOT_FOUND: -32001,
  INPUT_VALIDATION_FAILED: -32002,
  WORKFLOW_EXECUTION_FAILED: -32003,
  TIMEOUT: -32004,
  IDEMPOTENCY_CONFLICT: -32005,
  MISSING_API_KEYS: -32006,
} as const
