/**
 * Gateway catalog - defines all available gateways and their metadata
 */

import type { GatewayEntry } from "@lucky/shared/contracts/llm-contracts/providers"

/**
 * Provider catalog - defines all available providers and their metadata
 */
export const GATEWAYS: readonly GatewayEntry[] = [
  {
    gateway: "openai-api",
    displayName: "OpenAI",
    secretKeyName: "OPENAI_API_KEY",
    apiKeyValuePrefix: "sk-",
  },
  {
    gateway: "openrouter-api",
    displayName: "OpenRouter",
    secretKeyName: "OPENROUTER_API_KEY",
    apiKeyValuePrefix: "sk-or-v1-",
  },
  {
    gateway: "groq-api",
    displayName: "Groq",
    secretKeyName: "GROQ_API_KEY",
    apiKeyValuePrefix: "gsk_",
  },
] as const

/**
 * Backward compatibility alias
 */
export const PROVIDERS = GATEWAYS
