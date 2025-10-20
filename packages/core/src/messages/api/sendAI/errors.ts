/**
 * Centralized error normalization utilities for sendAI.
 */

export type NormalizedError = { message: string; debug: any }

/**
 * Normalizes various error shapes (plain Error, AI SDK errors, unknown) into a
 * concise message plus a serializable debug object.
 */
export function normalizeError(error: unknown): NormalizedError {
  // Heuristic: detect AI SDK API call errors without depending on SDK internals
  const isAPICallErrorLike = (err: unknown): boolean => {
    if (!err || typeof err !== "object") return false
    const rec = err as Record<string, unknown>
    const nameVal = rec.name
    const statusCodeVal = rec.statusCode
    const responseBodyVal = rec.responseBody
    const responseBodySnippetVal = rec.responseBodySnippet
    const responseHeadersVal = rec.responseHeaders
    return (
      (typeof nameVal === "string" && nameVal === "APICallError") ||
      typeof statusCodeVal === "number" ||
      typeof responseBodyVal === "string" ||
      typeof responseBodySnippetVal === "string" ||
      (typeof responseHeadersVal === "object" && responseHeadersVal !== null)
    )
  }

  if (isAPICallErrorLike(error)) {
    const rec = error as Record<string, unknown>
    const name = typeof rec.name === "string" ? (rec.name as string) : undefined
    const messageIn = typeof rec.message === "string" ? (rec.message as string) : undefined
    const statusCode = typeof rec.statusCode === "number" ? (rec.statusCode as number) : undefined
    const responseBody = typeof rec.responseBody === "string" ? (rec.responseBody as string) : undefined
    const responseBodySnippet =
      typeof rec.responseBodySnippet === "string" ? (rec.responseBodySnippet as string) : undefined
    const responseHeaders =
      typeof rec.responseHeaders === "object" && rec.responseHeaders !== null
        ? (rec.responseHeaders as Record<string, string>)
        : undefined
    const url = typeof rec.url === "string" ? (rec.url as string) : undefined

    // Use responseBody if available, otherwise fall back to responseBodySnippet
    const body =
      typeof responseBody === "string"
        ? responseBody
        : typeof responseBodySnippet === "string"
          ? responseBodySnippet
          : ""
    const isEmptyBody200 = statusCode === 200 && body.length === 0

    // Extract error message from response body or snippet (OpenRouter, OpenAI, etc.)
    let extractedMessage: string | undefined
    if (!isEmptyBody200 && body) {
      try {
        const parsed = JSON.parse(body)
        // Try multiple error message patterns from different providers
        if (parsed?.error?.metadata?.raw) {
          const raw = parsed.error.metadata.raw
          try {
            const rawParsed = typeof raw === "string" ? JSON.parse(raw) : raw
            extractedMessage = rawParsed?.message ?? String(raw)
          } catch {
            extractedMessage = String(raw)
          }
        } else if (parsed?.error?.message) {
          // OpenRouter, OpenAI format: { error: { message: "..." } }
          extractedMessage = parsed.error.message
        } else if (parsed?.message) {
          // Alternative format: { message: "..." }
          extractedMessage = parsed.message
        }
      } catch {
        // ignore parse errors; fall back to base message
      }
    }

    // Provider-aware friendly messages
    let gateway: string | undefined
    try {
      if (url) {
        const host = new URL(url).hostname
        if (host.includes("openrouter.ai")) gateway = "openrouter-api"
        else if (host.includes("api.openai.com")) gateway = "openai-api"
        else if (host.includes("api.groq.com")) gateway = "groq-api"
        else if (host.includes("googleapis.com") || host.includes("generativelanguage")) gateway = "google-api"
        else if (host.includes("anthropic.com")) gateway = "anthropic-api"
      }
    } catch {}

    const baseMessage = isEmptyBody200
      ? "Provider returned 200 with empty body (invalid JSON)."
      : extractedMessage || messageIn || "Upstream provider error"

    // Convert gateway to display name for friendly messages
    const gatewayDisplayName = gateway
      ? gateway
          .replace("-api", "")
          .split("-")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join("")
      : undefined

    let friendly: string | undefined
    switch (statusCode) {
      case 401:
        friendly = `${gatewayDisplayName ? `${gatewayDisplayName}: ` : ""}Authentication failed. Check your API key/credentials.`
        break
      case 402:
        friendly = `${gatewayDisplayName ? `${gatewayDisplayName}: ` : ""}Insufficient credits or requested max tokens too high. Reduce max_tokens/maxTokens or add credits.`
        break
      case 403:
        friendly = `${gatewayDisplayName ? `${gatewayDisplayName}: ` : ""}Access denied. The model or endpoint may be unavailable for your account.`
        break
      case 404:
        friendly = `${gatewayDisplayName ? `${gatewayDisplayName}: ` : ""}Endpoint or model not found.`
        break
      case 408:
        friendly = `${gatewayDisplayName ? `${gatewayDisplayName}: ` : ""}Request timed out. Please retry with a smaller prompt or later.`
        break
      case 429:
        friendly = `${gatewayDisplayName ? `${gatewayDisplayName}: ` : ""}Rate limit exceeded. Slow down requests or upgrade your plan.`
        break
      case 500:
      case 502:
      case 503:
      case 504:
        friendly = `${gatewayDisplayName ? `${gatewayDisplayName}: ` : ""}Service is temporarily unavailable. Please retry.`
        break
      default:
        friendly = undefined
    }

    const message = friendly ?? baseMessage

    return {
      message,
      debug: {
        name: name ?? "APICallError",
        statusCode,
        url,
        responseHeaders,
        responseBodySnippet: body ? body.slice(0, 1000) : "",
        gateway: gateway,
      },
    }
  }

  // Other AI SDK errors (e.g., AI_JSONParseError, AI_TypeValidationError, ...)
  if (typeof (error as any)?.name === "string" && (error as any).name.startsWith("AI_")) {
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
