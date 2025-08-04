/**
 * ModelRegistry implementation for runtime model management
 */

import type { ModelRegistry as IModelRegistry } from "./interfaces"
import {
  type ActiveModelName,
  MODELS,
  type ModelName,
  type Provider,
  isActiveModel,
  pricing,
  providers,
} from "./settings/models"

export class ModelRegistry implements IModelRegistry {
  private activeModels: Set<ActiveModelName>
  private providerModels: Map<Provider, ModelName[]>

  // Expose MODELS for backward compatibility
  readonly MODELS = MODELS

  constructor() {
    this.activeModels = new Set()
    this.providerModels = new Map()
    this.initialize()
  }

  private initialize(): void {
    // Build active models set
    for (const [modelName, config] of Object.entries(pricing)) {
      if (config.active && isActiveModel(modelName as ModelName)) {
        this.activeModels.add(modelName as ActiveModelName)
      }
    }

    // Build provider-model mapping
    for (const [provider, models] of Object.entries(providers)) {
      const providerKey = provider as Provider
      const modelNames = Object.keys(models).map((model) => {
        // For openrouter, the model name already includes the provider prefix
        // For openai and groq, we need to add the provider prefix
        return (
          provider === "openrouter" ? model : `${provider}/${model}`
        ) as ModelName
      })
      this.providerModels.set(providerKey, modelNames)
    }
  }

  isActive(model: ModelName): model is ActiveModelName {
    return this.activeModels.has(model as ActiveModelName)
  }

  getActiveModels(): ActiveModelName[] {
    return Array.from(this.activeModels)
  }

  getModelsForProvider(provider: Provider): ModelName[] {
    return this.providerModels.get(provider) || []
  }

  normalizeModel(model: ModelName): ActiveModelName {
    // If the model is already active, return it
    if (this.isActive(model)) {
      return model
    }

    // Try to find an active model from the same provider
    let provider: Provider | undefined

    // Determine provider from model name
    if (model.startsWith("openai/")) {
      provider = "openai"
    } else if (model.startsWith("groq/")) {
      provider = "groq"
    } else if (model.includes("/")) {
      // Assume it's an OpenRouter model (e.g., "google/gemini-2.5-flash-lite")
      provider = "openrouter"
    }

    if (provider) {
      const providerModels = this.getModelsForProvider(provider)
      const activeFromProvider = providerModels.find((m) => this.isActive(m))

      if (activeFromProvider && this.isActive(activeFromProvider)) {
        return activeFromProvider
      }
    }

    // Fallback to a default active model
    const defaultModel = this.getActiveModels()[0]
    if (!defaultModel) {
      throw new Error("No active models available")
    }

    return defaultModel
  }

  getModelPricing(model: ModelName): {
    input: number
    output: number
    cached: number
    contextLength: number
  } {
    const config = pricing[model]
    if (!config) {
      throw new Error(`No pricing configuration found for model: ${model}`)
    }

    return {
      input: config.input,
      output: config.output,
      cached: config["cached-input"] || 0,
      contextLength: config.context_length,
    }
  }

  /**
   * Update model active status at runtime
   */
  setModelActive(model: ModelName, active: boolean): void {
    const config = pricing[model]
    if (!config) {
      throw new Error(`Model not found: ${model}`)
    }

    // Note: This modifies the runtime state, not the original config
    if (active && isActiveModel(model)) {
      this.activeModels.add(model as ActiveModelName)
    } else {
      this.activeModels.delete(model as ActiveModelName)
    }
  }

  /**
   * Get comprehensive model information
   */
  getModelInfo(model: ModelName): {
    name: ModelName
    provider: Provider
    active: boolean
    pricing: ReturnType<typeof this.getModelPricing>
    info: string
  } {
    const config = pricing[model]
    if (!config) {
      throw new Error(`Model not found: ${model}`)
    }

    // Determine provider from model name
    let provider: Provider
    if (model.startsWith("openai/")) {
      provider = "openai"
    } else if (model.startsWith("groq/")) {
      provider = "groq"
    } else {
      // Default to openrouter for models with other prefixes
      provider = "openrouter"
    }

    return {
      name: model,
      provider,
      active: this.isActive(model),
      pricing: this.getModelPricing(model),
      info: config.info,
    }
  }
}
