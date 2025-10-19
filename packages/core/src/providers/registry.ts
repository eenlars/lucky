/**
 * Provider Registry
 * Single source of truth for all provider configuration
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

/**
 * Common provider API keys to check as fallback
 * Derived from PROVIDERS catalog + legacy Anthropic support
 */
export const PROVIDER_API_KEYS = [
  ...PROVIDERS.map(p => p.apiKeyName),
  "ANTHROPIC_API_KEY", // Legacy support - not in catalog
] as const

/**
 * Fallback provider IDs to use when no workflow config is available
 * These are provider identifiers, not API key names
 */
export const FALLBACK_PROVIDER_IDS = ["openai", "openrouter", "groq"] as const
