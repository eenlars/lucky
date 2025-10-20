/**
 * Type definitions for the models package
 */

import type { LuckyProvider } from "@repo/shared"

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
  apiKeys?: Partial<Record<LuckyProvider, string>>
}
