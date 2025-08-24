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
    const nameVal = rec["name"]
    const statusCodeVal = rec["statusCode"]
    const responseBodyVal = rec["responseBody"]
    const responseHeadersVal = rec["responseHeaders"]
    return (
      (typeof nameVal === "string" && nameVal === "APICallError") ||
      typeof statusCodeVal === "number" ||
      typeof responseBodyVal === "string" ||
      (typeof responseHeadersVal === "object" && responseHeadersVal !== null)
    )
  }

  if (isAPICallErrorLike(error)) {
    const rec = error as Record<string, unknown>
    const name =
      typeof rec["name"] === "string" ? (rec["name"] as string) : undefined
    const messageIn =
      typeof rec["message"] === "string"
        ? (rec["message"] as string)
        : undefined
    const statusCode =
      typeof rec["statusCode"] === "number"
        ? (rec["statusCode"] as number)
        : undefined
    const responseBody =
      typeof rec["responseBody"] === "string"
        ? (rec["responseBody"] as string)
        : undefined
    const responseHeaders =
      typeof rec["responseHeaders"] === "object" &&
      rec["responseHeaders"] !== null
        ? (rec["responseHeaders"] as Record<string, string>)
        : undefined
    const url =
      typeof rec["url"] === "string" ? (rec["url"] as string) : undefined

    const body = typeof responseBody === "string" ? responseBody : ""
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

    // Provider-aware friendly messages
    let provider: string | undefined
    try {
      if (url) {
        const host = new URL(url).hostname
        if (host.includes("openrouter.ai")) provider = "OpenRouter"
        else if (host.includes("api.openai.com")) provider = "OpenAI"
        else if (host.includes("api.groq.com")) provider = "Groq"
        else if (
          host.includes("googleapis.com") ||
          host.includes("generativelanguage")
        )
          provider = "Google"
        else if (host.includes("anthropic.com")) provider = "Anthropic"
      }
    } catch {}

    const baseMessage = isEmptyBody200
      ? "Provider returned 200 with empty body (invalid JSON)."
      : extractedMessage || messageIn || "Upstream provider error"

    let friendly: string | undefined
    switch (statusCode) {
      case 401:
        friendly = `${provider ? provider + ": " : ""}Authentication failed. Check your API key/credentials.`
        break
      case 402:
        friendly = `${provider ? provider + ": " : ""}Insufficient credits or requested max tokens too high. Reduce max_tokens/maxTokens or add credits.`
        break
      case 403:
        friendly = `${provider ? provider + ": " : ""}Access denied. The model or endpoint may be unavailable for your account.`
        break
      case 404:
        friendly = `${provider ? provider + ": " : ""}Endpoint or model not found.`
        break
      case 408:
        friendly = `${provider ? provider + ": " : ""}Request timed out. Please retry with a smaller prompt or later.`
        break
      case 429:
        friendly = `${provider ? provider + ": " : ""}Rate limit exceeded. Slow down requests or upgrade your plan.`
        break
      case 500:
      case 502:
      case 503:
      case 504:
        friendly = `${provider ? provider + ": " : ""}Service is temporarily unavailable. Please retry.`
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
        provider,
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
