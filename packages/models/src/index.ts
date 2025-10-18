/**
 * @lucky/models - Simplified AI model management package
 *
 * A thin wrapper around the AI SDK supporting multiple providers,
 * user-specific model selection, and both BYOK and shared API keys.
 */

// Main exports
export { createLLMRegistry, LLMRegistry } from "./llm-registry"
export { UserModels } from "./user-models"

// Type exports
export type { ModelEntry } from "@lucky/shared"
export type { FallbackKeys, RegistryConfig, UserConfig } from "./types"

// Catalog data export
export { MODEL_CATALOG } from "./llm-catalog/catalog"

// Catalog query functions
export {
  findModel,
  findModelById,
  findModelByName,
  getActiveModelsByProvider,
  getAllProviders, // Backward compatibility alias
  getCatalog,
  getModelsByProvider,
  getProviderInfo,
  getRuntimeEnabledModels,
  getRuntimeEnabledProviders,
} from "./llm-catalog/catalog-queries"

// Tier mapping exports
export { mapModelNameToEasyName, mapModelToTier } from "./tier-mapping"

// UI utility exports
export { isUIVisibleModel } from "./ui-utils"

// Provider utility exports
export {
  FALLBACK_PROVIDER_KEYS,
  formatMissingProviders,
  getProviderDisplayName,
  getProviderKeyName,
  getRequiredProviderKeys,
  validateProviderKeys,
} from "./provider-utils"
