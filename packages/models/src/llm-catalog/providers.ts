/**
 * Provider Catalog
 * Single source of truth for provider metadata
 */

import type { ProviderEntry } from "@lucky/shared"

/**
 * Provider catalog - defines all available providers and their metadata
 */
export const PROVIDERS: readonly ProviderEntry[] = [
  {
    provider: "openai",
    displayName: "OpenAI",
    secretKeyName: "OPENAI_API_KEY",
    apiKeyValuePrefix: "sk-",
  },
  {
    provider: "openrouter",
    displayName: "OpenRouter",
    secretKeyName: "OPENROUTER_API_KEY",
    apiKeyValuePrefix: "sk-or-v1-",
  },
  {
    provider: "groq",
    displayName: "Groq",
    secretKeyName: "GROQ_API_KEY",
    apiKeyValuePrefix: "gsk_",
  },
] as const
