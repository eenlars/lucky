/**
 * Provider registry for managing AI SDK providers
 * Creates and caches model instances
 */

import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { AiSdkModel, ModelSpec, ProviderConfig } from "../types"

export class ProviderRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private providers = new Map<string, any>()
  private modelCache = new Map<string, AiSdkModel>()
  private configs: Record<string, ProviderConfig>

  constructor(configs: Record<string, ProviderConfig>) {
    this.configs = configs
    this.initializeProviders()
  }

  /**
   * Get an AI SDK model
   */
  async getModel(spec: ModelSpec): Promise<AiSdkModel> {
    const cacheKey = `${spec.provider}/${spec.model}`

    // Check cache first
    const cached = this.modelCache.get(cacheKey)
    if (cached) {
      return cached
    }

    // Create new model
    const model = await this.createModel(spec)
    this.modelCache.set(cacheKey, model)

    return model
  }

  /**
   * Update provider configuration
   */
  updateProvider(providerId: string, config: Partial<ProviderConfig>): void {
    const existing = this.configs[providerId]
    if (!existing) {
      return
    }

    this.configs[providerId] = { ...existing, ...config }

    // Clear cache for this provider
    for (const key of this.modelCache.keys()) {
      if (key.startsWith(`${providerId}/`)) {
        this.modelCache.delete(key)
      }
    }

    // Reinitialize this provider
    this.initializeProvider(providerId, this.configs[providerId])
  }

  /**
   * Initialize all providers
   */
  private initializeProviders(): void {
    for (const [id, config] of Object.entries(this.configs)) {
      if (config.enabled !== false) {
        this.initializeProvider(id, config)
      }
    }
  }

  /**
   * Initialize a single provider
   */
  private initializeProvider(id: string, config: ProviderConfig): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let provider: any

    switch (id) {
      case "openai":
        provider = createOpenAI({
          apiKey: config.apiKey,
          baseURL: config.baseUrl,
          headers: config.headers,
        })
        break

      case "anthropic":
        provider = createAnthropic({
          apiKey: config.apiKey,
          baseURL: config.baseUrl,
          headers: config.headers,
        })
        break
      default:
        // Use OpenAI-compatible for custom providers
        provider = createOpenAICompatible({
          name: id,
          apiKey: config.apiKey || "not-needed",
          baseURL: config.baseUrl || "http://localhost:11434/v1",
          headers: config.headers,
        })
        break
    }

    this.providers.set(id, provider)
  }

  /**
   * Create a model instance
   */
  private async createModel(spec: ModelSpec): Promise<AiSdkModel> {
    const provider = this.providers.get(spec.provider)
    if (!provider) {
      throw new Error(`Provider ${spec.provider} not found or not initialized`)
    }

    // Get language model from provider
    const model = provider.languageModel(spec.model)

    return model as AiSdkModel
  }

  /**
   * Clear model cache
   */
  clearCache(): void {
    this.modelCache.clear()
  }
}
