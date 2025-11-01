/**
 * Type definitions for the models package
 */

import type { LuckyGateway } from "@lucky/shared"

export type FallbackKeys = Partial<Record<LuckyGateway, string>>

export interface RegistryConfig {
  fallbackKeys: FallbackKeys
}

export interface UserConfig {
  mode: "byok" | "shared"
  userId: string
  models: string[]
  apiKeys?: Partial<Record<LuckyGateway, string>>
  /**
   * Optional per-request overrides for fallback keys when using shared mode.
   * These are merged on top of the registry's default fallback configuration.
   */
  fallbackOverrides?: FallbackKeys
}
