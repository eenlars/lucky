/**
 * Client-safe model utilities for React components.
 * Thin wrapper around core utilities with browser-safe default provider.
 */
import {
  getActiveModelNames as coreGetActiveModelNames,
  getModelV2 as coreGetModelV2,
} from "@lucky/core/utils/spending/functions"
import type { AllowedModelName, ModelPricingV2 } from "@lucky/core/utils/spending/models.types"
import type { LuckyProvider } from "@lucky/core/utils/spending/provider"

/**
 * Browser default provider (hardcoded since runtime config requires Node.js).
 * Server-side code should use getCurrentProvider() from @lucky/core/utils/spending/provider.
 */
const BROWSER_DEFAULT_PROVIDER: LuckyProvider = "openrouter"

/**
 * Get all active models from provider structure.
 * Defaults to openrouter for browser contexts.
 */
export const getActiveModelNames = <T extends LuckyProvider>(customProvider?: T): AllowedModelName<T>[] => {
  return coreGetActiveModelNames(customProvider ?? (BROWSER_DEFAULT_PROVIDER as T))
}

/**
 * Get model pricing for a given model name. Throws if the model is unknown.
 * Defaults to openrouter for browser contexts.
 */
export function getModelV2(model: string, customProvider?: LuckyProvider): ModelPricingV2 {
  return coreGetModelV2(model, customProvider ?? BROWSER_DEFAULT_PROVIDER)
}
