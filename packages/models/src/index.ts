/**
 * Models - Multi-provider model configuration and registry for Vercel AI SDK
 * @module @lucky/models
 */

import { Models } from "./models"
import type { ModelsConfig } from "./types"

export { defineConfig, defineConfigUnsafe } from "./config/define"
export { ConfigLoader } from "./config/loader"
export { ProviderRegistry } from "./providers/registry"

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

export type {
  // Pricing types
  ModelPricing,
  PricingCache,
  PricingProvider,
} from "./types/pricing"

// Export Zod schemas and validation
export {
  executionContextSchema,
  executionStrategySchema,
  experimentConfigSchema,
  modelPricingSchema,
  modelsConfigSchema,
  modelSpecSchema,
  modelSpecStringSchema,
  modelSpecUnionSchema,
  pricingCacheSchema,
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
  ModelPricingInput,
  ModelPricingOutput,
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
