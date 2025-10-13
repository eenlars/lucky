/**
 * Multi-provider model registry and configuration
 * Returns AI SDK compatible models
 * Validates all configs with Zod at runtime
 */

import { ConfigLoader } from "./config/loader"
import { findModelByName } from "./pricing/model-lookup"
import { ProviderRegistry } from "./providers/registry"
import type { AiSdkModel, ExecutionContext, ModelSpec, ModelsConfig, ProviderConfig } from "./types"
import { modelsConfigSchema, providerConfigSchema } from "./types/schemas"

export class Models {
  private config: ModelsConfig
  private configLoader: ConfigLoader
  private registry: ProviderRegistry

  constructor(config: ModelsConfig) {
    // Validate config with Zod at runtime
    const validatedConfig = modelsConfigSchema.parse(config)

    this.config = validatedConfig
    this.configLoader = new ConfigLoader()
    this.registry = new ProviderRegistry(validatedConfig.providers)
  }

  /**
   * Get an AI SDK compatible model
   * This is the main API - returns a model that works with generateText/streamText
   *
   * @example
   * ```ts
   * const model = models.model('tier:fast')
   * const result = await generateText({ model, prompt: '...' })
   * ```
   */
  async model(spec: string | ModelSpec, context?: ExecutionContext): Promise<AiSdkModel> {
    // Resolve the spec to a concrete model
    const resolved = await this.resolveSpec(spec, context)

    // Get the model from the registry
    return this.registry.getModel(resolved)
  }

  /**
   * Load user configuration from YAML
   */
  async loadUserConfig(userId: string, path: string): Promise<void> {
    const config = await this.configLoader.load(path)
    this.configLoader.setUserConfig(userId, config)
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(providerId: string): ProviderConfig | undefined {
    return this.config.providers[providerId]
  }

  /**
   * Update provider configuration at runtime
   * Validates the updated config with Zod
   */
  updateProvider(providerId: string, config: Partial<ProviderConfig>): void {
    const existing = this.config.providers[providerId]
    if (!existing) {
      throw new Error(`Provider ${providerId} not found`)
    }

    const updatedConfig = {
      ...existing,
      ...config,
    }

    // Validate updated config with Zod
    const validatedConfig = providerConfigSchema.parse(updatedConfig)

    this.config.providers[providerId] = validatedConfig

    // Update registry
    this.registry.updateProvider(providerId, validatedConfig)
  }

  /**
   * Resolve a model spec to a concrete ModelSpec
   * Supports:
   * - "gpt-4o-mini" -> lookup in MODEL_CATALOG
   * - "anthropic/claude-sonnet-4" -> lookup in MODEL_CATALOG (uses catalog's provider field!)
   * - "tier:name" -> use tier config
   * - "user:userId:experiment" -> use user config
   *
   * CRITICAL: Never parse model name strings to determine provider.
   * Always use MODEL_CATALOG's provider field as source of truth.
   */
  private async resolveSpec(spec: string | ModelSpec, context?: ExecutionContext): Promise<ModelSpec> {
    // If already a ModelSpec, return it
    if (typeof spec !== "string") {
      return spec
    }

    // Handle tier references
    if (spec.startsWith("tier:")) {
      const tierName = spec.slice(5)
      return this.resolveTier(tierName)
    }

    // Handle user config references
    if (spec.startsWith("user:") && context?.userId) {
      const [, userId, experiment] = spec.split(":")
      return this.resolveUserConfig(userId || context.userId, experiment)
    }

    // Look up model in MODEL_CATALOG by API-format model name
    // This is the CORRECT way to resolve model names:
    // - "gpt-4o-mini" -> { provider: "openai", model: "gpt-4o-mini" }
    // - "anthropic/claude-sonnet-4" -> { provider: "openrouter", model: "anthropic/claude-sonnet-4" }
    // - "openai/gpt-oss-20b" -> { provider: "groq", model: "openai/gpt-oss-20b" }
    const catalogEntry = findModelByName(spec)
    if (catalogEntry) {
      return {
        provider: catalogEntry.provider,
        model: catalogEntry.model,
      }
    }

    // Fallback: If not in catalog and contains "/", try parsing
    // This maintains backward compatibility for models not yet in catalog
    if (spec.includes("/")) {
      const [provider, model] = spec.split("/", 2)
      return { provider, model }
    }

    // Fallback to default tier
    if (this.config.defaultTier) {
      return this.resolveTier(this.config.defaultTier)
    }

    throw new Error(`Cannot resolve model spec: ${spec}. Not found in MODEL_CATALOG and no default tier configured.`)
  }

  private resolveTier(tierName: string): ModelSpec {
    const tier = this.config.tiers?.[tierName]
    if (!tier) {
      throw new Error(`Tier ${tierName} not found`)
    }

    // For now, use first model in tier
    // TODO: Implement strategy-based selection
    const firstModel = tier.models[0]
    if (!firstModel) {
      throw new Error(`No models in tier ${tierName}`)
    }

    return firstModel
  }

  private async resolveUserConfig(userId: string, experimentName?: string): Promise<ModelSpec> {
    const config = this.configLoader.getUserConfig(userId)
    if (!config) {
      throw new Error(`No config found for user ${userId}`)
    }

    // Get experiment name
    const experiment = experimentName || config.defaults?.experiment
    if (!experiment) {
      throw new Error("No experiment specified")
    }

    const experimentConfig = config.experiments?.[experiment]
    if (!experimentConfig) {
      throw new Error(`Experiment ${experiment} not found`)
    }

    // Get first provider from experiment
    // TODO: Implement strategy-based selection
    const providerStr = experimentConfig.providers[0]
    if (!providerStr) {
      throw new Error(`No providers in experiment ${experiment}`)
    }

    const [provider, model] = providerStr.split("/", 2)
    return { provider, model }
  }
}
