/**
 * Server-side error logging utility for core package.
 *
 * Logs errors to app.errors table with deduplication and tracking.
 * Unlike the client-side logger, this writes directly to the database
 * without making HTTP requests (more efficient for server-side errors).
 */

import crypto from "node:crypto"
import type { ErrorReportInput, SeverityLevel } from "@lucky/shared"

/**
 * Error logger interface - allows dependency injection for testing
 * and supports both direct DB writes and HTTP-based logging
 */
export interface ErrorLogger {
  log(input: ErrorLogInput): Promise<void>
}

export interface ErrorLogInput {
  location: string
  env: "production" | "development"
  error?: unknown
  message: string
  stack?: string | null
  severity?: SeverityLevel
  clerkId?: string | null
  /** Additional context to include in error JSON */
  context?: Record<string, unknown>
}

/**
 * Type guard to check if value is a record
 */
function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val)
}

/**
 * Deterministic JSON stringify with sorted keys for hash consistency
 */
function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value !== "object") return JSON.stringify(value)

  const seen = new WeakSet()
  const sorter = (val: unknown): unknown => {
    if (val && typeof val === "object") {
      if (seen.has(val)) return "[Circular]"
      seen.add(val)

      if (Array.isArray(val)) return val.map(sorter)

      if (isRecord(val)) {
        const obj: Record<string, unknown> = {}
        for (const key of Object.keys(val).sort()) {
          obj[key] = sorter(val[key])
        }
        return obj
      }
    }
    return val
  }

  return JSON.stringify(sorter(value))
}

/**
 * Compute deterministic hash for error deduplication
 */
function computeHash(parts: {
  location: string
  env: "production" | "development"
  error: unknown
  message: string
  severity: SeverityLevel
}): string {
  const errorStr = stableStringify(parts.error)
  const payload = [parts.location, parts.env, errorStr, parts.message, parts.severity].join("|")
  return crypto.createHash("sha256").update(payload).digest("hex")
}

/**
 * Normalize any thrown value into a structured error object
 */
function normalizeError(e: unknown): {
  message: string
  stack?: string
  name?: string
  [key: string]: unknown
} {
  if (e instanceof Error) {
    return {
      message: e.message,
      stack: e.stack,
      name: e.name,
      ...(e.cause ? { cause: e.cause } : {}),
    }
  }
  if (typeof e === "string") {
    return { message: e }
  }
  if (isRecord(e)) {
    return {
      message: typeof e.message === "string" ? e.message : String(e),
      stack: typeof e.stack === "string" ? e.stack : undefined,
      name: typeof e.name === "string" ? e.name : undefined,
      ...e,
    }
  }
  return { message: String(e) }
}

/**
 * Serialize error to JSON-safe object with context
 */
function serializeError(e: unknown, context?: Record<string, unknown>): Record<string, unknown> {
  const normalized = normalizeError(e)

  return {
    ...normalized,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  }
}

/**
 * No-op error logger for testing or when DB logging is disabled
 */
export class NoOpErrorLogger implements ErrorLogger {
  async log(input: ErrorLogInput): Promise<void> {
    // Silent no-op
    console.debug("[NoOpErrorLogger] Would log:", input.message)
  }
}

/**
 * HTTP-based error logger (makes fetch calls to /api/log-error)
 * Useful for client-side or when DB client is not available
 */
export class HttpErrorLogger implements ErrorLogger {
  constructor(private readonly baseUrl?: string) {}

  async log(input: ErrorLogInput): Promise<void> {
    try {
      const url = this.baseUrl ? `${this.baseUrl}/api/log-error` : "/api/log-error"

      const payload: ErrorReportInput = {
        location: input.location,
        env: input.env,
        error: input.error ? serializeError(input.error, input.context) : null,
        message: input.message,
        stack: input.stack ?? null,
        severity: input.severity ?? "error",
        clerkId: input.clerkId ?? null,
      }

      await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      // Never throw from error logger
      console.error("[HttpErrorLogger] Failed to log error:", err)
    }
  }
}

/**
 * Get base URL for API calls in server-side context
 */
function getBaseUrl(): string | undefined {
  if (typeof window !== "undefined") {
    return undefined // Client-side uses relative URLs
  }

  // Server-side: try various env vars for base URL
  const baseUrl =
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL

  if (baseUrl) {
    return baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
  }

  // Fallback for local development
  const port = process.env.PORT || "3000"
  return `http://localhost:${port}`
}

/**
 * Initialize default error logger based on environment
 */
function createDefaultLogger(): ErrorLogger {
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"

  if (isTest) {
    return new NoOpErrorLogger()
  }

  return new HttpErrorLogger(getBaseUrl())
}

/**
 * Global error logger instance (injectable for testing)
 */
let globalLogger: ErrorLogger = createDefaultLogger()

/**
 * Set the global error logger implementation
 */
export function setErrorLogger(logger: ErrorLogger): void {
  globalLogger = logger
}

/**
 * Get the current global error logger
 */
export function getErrorLogger(): ErrorLogger {
  return globalLogger
}

/**
 * Convenience function to log errors with auto-detection
 * Always logs to console AND sends to backend
 */
export async function logError(input: ErrorLogInput): Promise<void> {
  // Always log to console for immediate visibility
  const logPrefix = `[ErrorLogger:${input.location}]`
  const severityIcon =
    input.severity === "error" ? "❌" : input.severity === "warn" || input.severity === "warning" ? "⚠️" : "ℹ️"

  console.error(`${severityIcon} ${logPrefix} ${input.message}`)

  if (input.context) {
    console.error(`${logPrefix} Context:`, input.context)
  }

  if (input.stack) {
    console.error(`${logPrefix} Stack:`, input.stack)
  }

  // Also send to backend for persistence and tracking
  await globalLogger.log(input)
}

/**
 * Convenience function to log exceptions with minimal boilerplate
 */
export async function logException(
  error: unknown,
  options?: {
    location?: string
    context?: Record<string, unknown>
    severity?: SeverityLevel
    clerkId?: string | null
  },
): Promise<void> {
  const normalized = normalizeError(error)
  const env = process.env.NODE_ENV === "production" ? "production" : "development"

  await logError({
    location: options?.location ?? "unknown",
    env,
    error: serializeError(error, options?.context),
    message: normalized.message,
    stack: normalized.stack ?? null,
    severity: options?.severity ?? "error",
    clerkId: options?.clerkId ?? null,
    context: options?.context,
  })
}
