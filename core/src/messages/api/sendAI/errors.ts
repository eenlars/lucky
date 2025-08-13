/**
 * Centralized error normalization utilities for sendAI.
 */

import { APICallError } from "ai"

export type NormalizedError = { message: string; debug: any }

/**
 * Normalizes various error shapes (plain Error, AI SDK errors, unknown) into a
 * concise message plus a serializable debug object.
 */
export function normalizeError(error: unknown): NormalizedError {
  if (APICallError.isInstance(error as any)) {
    const e = error as unknown as {
      name?: string
      message?: string
      statusCode?: number
      responseBody?: string
      responseHeaders?: Record<string, string>
      url?: string
    }

    const statusCode = e.statusCode
    const body = typeof e.responseBody === "string" ? e.responseBody : ""
    const isEmptyBody200 = statusCode === 200 && body.length === 0

    let extractedMessage: string | undefined
    if (!isEmptyBody200 && body) {
      try {
        const parsed = JSON.parse(body)
        if (parsed?.error?.metadata?.raw) {
          const raw = parsed.error.metadata.raw
          try {
            const rawParsed = typeof raw === "string" ? JSON.parse(raw) : raw
            extractedMessage = rawParsed?.message ?? String(raw)
          } catch {
            extractedMessage = String(raw)
          }
        } else if (parsed?.error?.message) {
          extractedMessage = parsed.error.message
        } else if (parsed?.message) {
          extractedMessage = parsed.message
        }
      } catch {
        // ignore parse errors; fall back to base message
      }
    }

    const message = isEmptyBody200
      ? "Provider returned 200 with empty body (invalid JSON)."
      : extractedMessage || e.message || "Upstream provider error"

    return {
      message,
      debug: {
        name: e.name ?? "APICallError",
        statusCode,
        url: e.url,
        responseHeaders: e.responseHeaders,
        responseBodySnippet: body ? body.slice(0, 1000) : "",
      },
    }
  }

  // Other AI SDK errors (e.g., AI_JSONParseError, AI_TypeValidationError, ...)
  if (
    typeof (error as any)?.name === "string" &&
    (error as any).name.startsWith("AI_")
  ) {
    const e = error as any
    return {
      message: e.message || e.name || "AI SDK error",
      debug: {
        name: e.name,
        message: e.message,
        stack: e.stack,
      },
    }
  }

  if (error instanceof Error) {
    return {
      message: error.message || "Unknown error",
      debug: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }
  }

  try {
    return { message: "Unknown error", debug: error }
  } catch {
    return { message: "Unknown error", debug: String(error) }
  }
}
