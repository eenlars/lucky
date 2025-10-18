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
    apiKeyName: "OPENAI_API_KEY",
    apiKeyPrefix: "sk-",
  },
  {
    provider: "openrouter",
    displayName: "OpenRouter",
    apiKeyName: "OPENROUTER_API_KEY",
    apiKeyPrefix: "sk-or-v1-",
  },
  {
    provider: "groq",
    displayName: "Groq",
    apiKeyName: "GROQ_API_KEY",
    apiKeyPrefix: "gsk_",
  },
] as const
