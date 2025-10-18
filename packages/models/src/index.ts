/**
 * Models - Multi-provider model configuration and registry for Vercel AI SDK
 * @module @lucky/models
 *
 * Browser-safe exports only. Server-only code (Models class, ConfigLoader, defineConfig)
 * is available via '@lucky/models/server'
 */

import type { ModelsConfig } from "./types"

// Server-only exports (use node:fs/promises):
//   import { Models, ConfigLoader, defineConfig } from '@lucky/models/server'

export { ProviderRegistry } from "./providers/registry"

// Facade is server-only (imports Models class which uses node:fs/promises)
// Import from '@lucky/models/server' instead:
//   import { getFacade, ModelsFacade, resetFacade } from '@lucky/models/server'

// Export Pricing
export {
  getRuntimeEnabledModels,
  getRuntimeEnabledProviders,
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
  getRuntimeEnabledModelsByProvider as getActiveModelsByProvider,
  getModel,
  isRuntimeEnabled as isModelActive,
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

// Models class and createModels are server-only (use node:fs/promises)
// Import from '@lucky/models/server' instead

/**
 * Create a new models registry (SERVER-ONLY)
 *
 * @example
 * ```ts
 * import { createModels } from '@lucky/models/server'
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
export function createModels(config: ModelsConfig): never {
  throw new Error("createModels() is server-only (uses node:fs/promises). Import from '@lucky/models/server' instead.")
}
