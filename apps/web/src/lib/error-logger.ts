import { type ErrorReportInput, ErrorReportSchema } from "@lucky/shared"

/**
 * Type guard to check if value is a record
 */
function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val)
}

/**
 * Detect environment: production if VERCEL_ENV=production or hostname is not localhost/127.0.0.1
 */
function detectEnv(): "production" | "development" {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.")
      ? "development"
      : "production"
  }
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production" ? "production" : "development"
}

/**
 * Constructs the absolute URL for the error logging endpoint
 * Required for server-side (Node.js) fetch calls
 */
function getErrorLogUrl(): string {
  // Client-side: relative URL works fine
  if (typeof window !== "undefined") {
    return "/api/log-error"
  }

  // Server-side: need absolute URL
  // Try various environment variables for the base URL
  const baseUrl =
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    process.env.VERCEL_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL

  if (baseUrl) {
    // Ensure baseUrl has protocol
    const url = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`
    return `${url}/api/log-error`
  }

  // Fallback for local development
  const port = process.env.PORT || "3000"
  return `http://localhost:${port}/api/log-error`
}

/**
 * Safe helper to report errors from anywhere in the app
 * NEVER throws - swallows all errors to prevent cascading failures
 * Works on both client and server (Node.js API routes)
 */
export async function logError(input: ErrorReportInput): Promise<void> {
  try {
    // Validate input, but don't throw - just skip logging if invalid
    const parsed = ErrorReportSchema.safeParse(input)
    if (!parsed.success) {
      console.warn("Invalid error report input, skipping:", parsed.error)
      return
    }

    const url = getErrorLogUrl()

    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(parsed.data),
      keepalive: true, // helps during unload/navigation
    }).catch(err => {
      // Log fetch failure to console for debugging, but don't throw
      console.error("Failed to send error log:", err)
    })
  } catch {
    // Never throw from error logger
  }
}

/**
 * Convenience wrapper for logging exceptions with auto-detection of env and location
 * Simplified API - only pass what you want to override
 */
export function logException(
  e: unknown,
  extra?: Partial<Omit<ErrorReportInput, "message" | "stack" | "error">> & {
    message?: string
    error?: unknown
  },
) {
  const err = normalizeError(e)
  const location = extra?.location ?? (typeof window !== "undefined" ? window.location.pathname : "server")
  const env = extra?.env ?? detectEnv()

  return logError({
    location,
    env,
    error: extra?.error ?? serializeError(err),
    message: extra?.message ?? err.message ?? "Unknown error",
    stack: err.stack ?? null,
    severity: extra?.severity ?? "error",
    clerkId: extra?.clerkId ?? null,
  })
}

function normalizeError(e: unknown): { message?: string; stack?: string; name?: string } {
  if (e instanceof Error) {
    return {
      message: e.message,
      stack: e.stack,
      name: e.name,
    }
  }
  if (typeof e === "string") {
    return { message: e }
  }
  if (isRecord(e)) {
    return {
      message: typeof e.message === "string" ? e.message : undefined,
      stack: typeof e.stack === "string" ? e.stack : undefined,
      name: typeof e.name === "string" ? e.name : undefined,
    }
  }
  return { message: "Unknown error" }
}

function serializeError(e: { message?: string; stack?: string; name?: string }) {
  // Select a safe subset; avoid leaking huge fields or circular refs
  const base = {
    name: e.name ?? undefined,
    message: e.message ?? undefined,
    stack: undefined, // we store stack separately
  }

  // Safely add additional properties if they exist
  if (isRecord(e)) {
    return {
      ...base,
      ...("cause" in e ? { cause: e.cause } : {}),
      ...("code" in e ? { code: e.code } : {}),
    }
  }

  return base
}
