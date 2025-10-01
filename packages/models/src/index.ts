/**
 * Models - Multi-provider model configuration and registry for Vercel AI SDK
 * @module @lucky/models
 */

export { Models } from "./models"
export { ConfigLoader } from "./config/loader"
export { ProviderRegistry } from "./providers/registry"
export { defineConfig, defineConfigUnsafe } from "./config/define"

// Export types
export type {
  // Core types
  ProviderConfig,
  ExecutionStrategy,
  ModelSpec,
  ModelsConfig,
  TierConfig,
  ProviderMetrics,
  ExecutionContext,
  ModelResult,
  AiSdkModel,
  ModelFactory,
} from "./types"

export type {
  // Config types
  UserConfig,
  ExperimentConfig,
  ResolvedConfig,
} from "./types/config"

export type {
  // Pricing types
  ModelPricing,
  PricingProvider,
  PricingCache,
} from "./types/pricing"

// Export Zod schemas and validation
export {
  executionStrategySchema,
  modelSpecSchema,
  modelSpecStringSchema,
  modelSpecUnionSchema,
  modelsConfigSchema,
  providerConfigSchema,
  providersConfigSchema,
  tierConfigSchema,
  tiersConfigSchema,
  userConfigSchema,
  experimentConfigSchema,
  executionContextSchema,
  modelPricingSchema,
  pricingCacheSchema,
  providerMetricsSchema,
  validateModelsConfig,
  validateUserConfig,
  safeValidateModelsConfig,
  safeValidateUserConfig,
} from "./types/schemas"

export type {
  ProviderConfigInput,
  ProviderConfigOutput,
  ModelSpecInput,
  ModelSpecOutput,
  TierConfigInput,
  TierConfigOutput,
  ModelsConfigInput,
  ModelsConfigOutput,
  UserConfigInput,
  UserConfigOutput,
  ExecutionContextInput,
  ExecutionContextOutput,
  ModelPricingInput,
  ModelPricingOutput,
} from "./types/schemas"

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

// Re-export for convenience
import type { ModelsConfig } from "./types"
import { Models } from "./models"