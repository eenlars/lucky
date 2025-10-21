/**
 * @lucky/models - Simplified AI model management package
 *
 * A thin wrapper around the AI SDK supporting multiple gateways,
 * user-specific model selection, and both BYOK and shared API keys.
 */

// Main exports
export { LLMRegistry, createLLMRegistry } from "./llm-registry"
export { UserModels } from "./user-models"

// Type exports
export type { ModelEntry } from "@lucky/shared"
export type { FallbackKeys, RegistryConfig, UserConfig } from "./types"

// Catalog data export
export { MODEL_CATALOG } from "./llm-catalog/catalog"
export { GATEWAYS } from "./llm-catalog/providers"

// Catalog query functions
export {
  findModel,
  getActiveModelsByGateway,
  getAllGateways,
  getCatalog,
  getGatewayInfo,
  getModelsByGateway,
  getRuntimeEnabledGateways,
  getRuntimeEnabledModels,
} from "./llm-catalog/catalog-queries"

// Normalization utilities
export { normalizeGatewayModelId } from "./normalize"

// Tier selection utilities
export { findTierModels, selectModelForTier } from "./tier-selection"

// Tier mapping exports
export { mapGatewayModelIdToEasyName, mapModelToTier } from "./tier-mapping"

// UI utility exports
export { isUIVisibleModel } from "./ui-utils"

// Gateway utility exports
export {
  GATEWAY_API_KEYS,
  formatMissingGateways,
  getGatewayDisplayName,
  getGatewayKeyName,
  getRequiredGatewayKeys,
  validateGatewayKeys,
} from "./gateway-utils"

// Default models export
export { DEFAULT_MODELS } from "./llm-catalog/defaults"
