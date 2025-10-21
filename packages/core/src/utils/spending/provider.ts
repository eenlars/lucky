import { getCoreConfig } from "@core/core-config/coreConfig"
import type { LuckyGateway } from "@lucky/shared"

/**
 * Get the current provider from runtime configuration.
 * This is the ONLY way to determine the active provider - no compile-time constants.
 */
export function getCurrentGateway(): LuckyGateway {
  return getCoreConfig().models.gateway
}
