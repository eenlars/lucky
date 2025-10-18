/**
 * Type definitions for the models package
 */

export interface FallbackKeys {
  [provider: string]: string | undefined
}

export interface RegistryConfig {
  fallbackKeys: FallbackKeys
}

export interface UserConfig {
  mode: "byok" | "shared"
  userId: string
  models: string[]
  apiKeys?: {
    [provider: string]: string | undefined
  }
}
