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
export { getFacade, ModelsFacade, resetFacade } from "./facade"
export type { SelectionOptions } from "./facade"

// Export Pricing
export {
  getActiveModels,
  getActiveProviders,
  getAllProviders,
  getCatalogStats,
  getModelsByProvider,
  getProviderInfo,
  MODEL_CATALOG,
  validateCatalogIntegrity,
} from "./pricing/catalog"
export type { ProviderInfo } from "./pricing/catalog"
export { getPricingService, PricingService, resetPricingService } from "./pricing/pricing-service"
export type { PricingOverride, PricingSnapshot } from "./pricing/pricing-service"

// Export model lookup utilities
export {
  findModel,
  findModelByName,
  getActiveModelIds,
  getActiveModelsByProvider,
  getModel,
  isModelActive,
} from "./pricing/model-lookup"

export {
  assertModelType,
  formatModelType,
  isModelType,
  normalizeModelType,
  parseModelType,
  tryNormalizeModelType,
} from "./types/modelType"
export type { ModelType, ParsedModelType } from "./types/modelType"

// Export Registry
export { getRegistry, ModelRegistry, resetRegistry } from "./registry/model-registry"
export type { ModelQuery, RegistryStats } from "./registry/model-registry"

// Export Selector
export { getSelector, PolicySelector, resetSelector } from "./selector/policy-selector"
export type { SelectionReason } from "./selector/policy-selector"

// Export Observability
export { getLogger, ModelLogger, resetLogger, withPerformanceLogging } from "./observability/logger"
export type {
  CostLog,
  ErrorLog,
  FallbackLog,
  LogEntry,
  LoggerConfig,
  LogLevel,
  PerformanceLog,
  SelectionLog,
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
  // Alias: clarify provider config is for models runtime
  ProviderConfig as ModelsProviderConfig,
  // Core types
  ProviderConfig,
  ProviderMetrics,
  TierConfig,
} from "./types"

export type {
  ExperimentConfig,
  ResolvedConfig,
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
  // Alias: clarify that this schema is the runtime models provider config
  providerConfigSchema as modelsProviderConfigSchema,
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
  // Alias: clarify naming in downstream imports
  ProviderConfigOutput as ModelsProviderConfigOutput,
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
