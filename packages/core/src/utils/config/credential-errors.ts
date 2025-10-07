/**
 * Error types for credential and configuration issues.
 * Provides structured errors with actionable guidance for users.
 */

export type CredentialName =
  | "SUPABASE_ANON_KEY"
  | "OPENROUTER_API_KEY"
  | "OPENAI_API_KEY"
  | "GOOGLE_API_KEY"
  | "SERPAPI_API_KEY"
  | "MEM0_API_KEY"
  | "TAVILY_API_KEY"
  | "GROQ_API_KEY"

export type CredentialErrorCode = "MISSING" | "INVALID_FORMAT" | "UNAUTHORIZED" | "SERVICE_UNAVAILABLE"

export interface CredentialErrorDetails {
  credential: CredentialName
  code: CredentialErrorCode
  message: string
  userMessage: string
  setupUrl?: string
  fallbackAvailable?: boolean
}

/**
 * Error thrown when a required credential is missing or invalid.
 */
export class CredentialError extends Error {
  constructor(public readonly details: CredentialErrorDetails) {
    super(details.message)
    this.name = "CredentialError"
  }

  toJSON() {
    return {
      name: this.name,
      ...this.details,
    }
  }
}

/**
 * Result type for operations that may fail due to credentials.
 */
export type Result<T, E = CredentialError> = { ok: true; value: T } | { ok: false; error: E }

/**
 * Create a successful result.
 */
export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

/**
 * Create a failed result.
 */
export function err<E = CredentialError>(error: E): Result<never, E> {
  return { ok: false, error }
}

/**
 * Helper to create credential errors with standard messaging.
 */
export function createCredentialError(
  credential: CredentialName,
  code: CredentialErrorCode = "MISSING",
  customMessage?: string,
): CredentialError {
  const messages: Record<CredentialName, { message: string; userMessage: string; setupUrl?: string }> = {
    SUPABASE_ANON_KEY: {
      message: "Supabase anonymous key not configured",
      userMessage:
        "Database features require Supabase. Set SUPABASE_ANON_KEY in your environment or use in-memory mode with USE_MOCK_PERSISTENCE=true.",
      setupUrl: "/docs/setup/supabase",
    },
    OPENROUTER_API_KEY: {
      message: "OpenRouter API key not configured",
      userMessage: "AI model access requires an OpenRouter API key. Configure it in Settings → Environment Keys.",
      setupUrl: "https://openrouter.ai/keys",
    },
    OPENAI_API_KEY: {
      message: "OpenAI API key not configured",
      userMessage: "Some features require an OpenAI API key. Configure it in Settings → Environment Keys.",
      setupUrl: "https://platform.openai.com/api-keys",
    },
    GOOGLE_API_KEY: {
      message: "Google API key not configured",
      userMessage: "Google AI features require an API key. Configure it in Settings → Environment Keys.",
      setupUrl: "https://ai.google.dev/",
    },
    SERPAPI_API_KEY: {
      message: "SerpAPI key not configured",
      userMessage: "Search features require a SerpAPI key. Configure it in Settings → Environment Keys.",
      setupUrl: "https://serpapi.com/manage-api-key",
    },
    MEM0_API_KEY: {
      message: "Mem0 API key not configured",
      userMessage: "Enhanced memory features require a Mem0 API key. These features will be disabled.",
      setupUrl: "https://mem0.ai/",
    },
    TAVILY_API_KEY: {
      message: "Tavily API key not configured",
      userMessage: "Search features require a Tavily API key. Configure it in Settings → Environment Keys.",
      setupUrl: "https://tavily.com/",
    },
    GROQ_API_KEY: {
      message: "Groq API key not configured",
      userMessage: "Groq AI features require an API key. Configure it in Settings → Environment Keys.",
      setupUrl: "https://console.groq.com/keys",
    },
  }

  const { message, userMessage, setupUrl } = messages[credential]

  return new CredentialError({
    credential,
    code,
    message: customMessage || message,
    userMessage,
    setupUrl,
    fallbackAvailable: credential.startsWith("SUPABASE") || credential === "MEM0_API_KEY",
  })
}
