/**
 * Models - Multi-provider model configuration and registry for Vercel AI SDK
 * @module @lucky/models
 */

import { Models } from "./models"
import type { ModelsConfig } from "./types"

export { defineConfig, defineConfigUnsafe } from "./config/define"
export { ConfigLoader } from "./config/loader"
export { ProviderRegistry } from "./providers/registry"

// Export Facade (primary public API)
export { ModelsFacade, getFacade, resetFacade } from "./facade"
export type { SelectionOptions } from "./facade"

// Export Pricing
export { PricingService, getPricingService, resetPricingService } from "./pricing/pricing-service"
export type { PricingSnapshot, PricingOverride } from "./pricing/pricing-service"
export {
  MODEL_CATALOG,
  getActiveModels,
  getModelsByProvider,
  findModelById,
  getCatalogStats,
  getAllProviders,
  getActiveProviders,
  getProviderInfo,
  validateCatalogIntegrity,
} from "./pricing/catalog"
export type { ProviderInfo } from "./pricing/catalog"

// Export model lookup utilities (migration helpers)
export {
  findModel,
  getModel,
  normalizeModelId,
  isModelActive,
  getActiveModelsByProvider,
  getActiveModelIds,
} from "./pricing/model-lookup"

// Export Registry
export { ModelRegistry, getRegistry, resetRegistry } from "./registry/model-registry"
export type { ModelQuery, RegistryStats } from "./registry/model-registry"

// Export Selector
export { PolicySelector, getSelector, resetSelector } from "./selector/policy-selector"
export type { SelectionReason } from "./selector/policy-selector"

// Export Observability
export { ModelLogger, getLogger, resetLogger, withPerformanceLogging } from "./observability/logger"
export type {
  LogLevel,
  LogEntry,
  SelectionLog,
  CostLog,
  ErrorLog,
  FallbackLog,
  PerformanceLog,
  LoggerConfig,
} from "./observability/logger"

// Export types
export type {
  AiSdkModel,
  ExecutionContext,
  ExecutionStrategy,
  ModelFactory,
  ModelResult,
  ModelsConfig,
  ModelSpec,
  // Core types
  ProviderConfig,
  ProviderMetrics,
  TierConfig,
} from "./types"

export type {
  ExperimentConfig,
  ResolvedConfig,
  // Config types
  UserConfig,
} from "./types/config"

// Export Zod schemas and validation
export {
  executionContextSchema,
  executionStrategySchema,
  experimentConfigSchema,
  modelsConfigSchema,
  modelSpecSchema,
  modelSpecStringSchema,
  modelSpecUnionSchema,
  providerConfigSchema,
  providerMetricsSchema,
  providersConfigSchema,
  safeValidateModelsConfig,
  safeValidateUserConfig,
  tierConfigSchema,
  tiersConfigSchema,
  userConfigSchema,
  validateModelsConfig,
  validateUserConfig,
} from "./types/schemas"

export type {
  ExecutionContextInput,
  ExecutionContextOutput,
  ModelsConfigInput,
  ModelsConfigOutput,
  ModelSpecInput,
  ModelSpecOutput,
  ProviderConfigInput,
  ProviderConfigOutput,
  TierConfigInput,
  TierConfigOutput,
  UserConfigInput,
  UserConfigOutput,
} from "./types/schemas"

export { Models }

/**
 * Create a new models registry
 *
 * @example
 * ```ts
 * import { createModels } from '@lucky/models'
 * import { generateText } from 'ai'
 *
 * const models = createModels({
 *   providers: {
 *     openai: { apiKey: process.env.OPENAI_API_KEY },
 *     anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
 *     local: { baseUrl: 'http://localhost:11434/v1' }
 *   }
 * })
 *
 * // Use with AI SDK
 * const model = await models.model('openai/gpt-4')
 * const result = await generateText({ model, prompt: 'Hello!' })
 * ```
 */
export function createModels(config: ModelsConfig): Models {
  return new Models(config)
}
