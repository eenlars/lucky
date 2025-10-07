import { getCoreConfig } from "@core/core-config/coreConfig"
import type { LuckyProvider } from "@lucky/shared"

/**
 * Get the current provider from runtime configuration.
 * This is the ONLY way to determine the active provider - no compile-time constants.
 */
export function getCurrentProvider(): LuckyProvider {
  return getCoreConfig().models.provider
}
