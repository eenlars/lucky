/**
 * Type definitions for the models package
 */

export interface FallbackKeys {
  openai?: string
  groq?: string
  openrouter?: string
}

export interface RegistryConfig {
  fallbackKeys: FallbackKeys
}

export interface UserConfig {
  mode: "byok" | "shared"
  userId: string
  models: string[]
  apiKeys?: {
    openai?: string
    groq?: string
    openrouter?: string
  }
}
