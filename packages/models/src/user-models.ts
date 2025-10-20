/**
 * UserModels - Per-user model access with restricted model list
 */

import { createGroq, groq } from "@ai-sdk/groq"
import { createOpenAI, openai } from "@ai-sdk/openai"
import type { ProviderOptions } from "@ai-sdk/provider-utils"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import type { LanguageModel } from "ai"

import { type TierName, tierNameSchema } from "@lucky/shared"

import type { FallbackKeys } from "@lucky/models/types"
import type { ModelEntry } from "@lucky/shared"
import { MODEL_CATALOG } from "./llm-catalog/catalog"
import { findModel, toNormalModelName } from "./llm-catalog/catalog-queries"
import { selectModelForTier } from "./tier-selection"

type ProviderInstance =
  | ReturnType<typeof createOpenAI>
  | ReturnType<typeof createGroq>
  | ReturnType<typeof createOpenRouter>

export class UserModels {
  private userId: string
  private mode: "byok" | "shared"
  private allowedModels: readonly string[]
  private providers: Map<string, ProviderInstance>

  constructor(
    userId: string,
    mode: "byok" | "shared",
    allowedModels: string[],
    apiKeys: FallbackKeys,
    fallbackKeys: FallbackKeys,
  ) {
    this.userId = userId
    this.mode = mode
    // Freeze array to prevent mutation attacks
    this.allowedModels = Object.freeze([...allowedModels])

    // validate byok mode has keys
    if (mode === "byok" && (!apiKeys || Object.keys(apiKeys).length === 0)) {
      throw new Error("BYOK mode requires apiKeys")
    }

    // initialize providers with appropriate keys
    const keys = mode === "byok" ? apiKeys : fallbackKeys
    this.providers = this.initializeProviders(keys)
  }

  private initializeProviders(keys: FallbackKeys): Map<string, ProviderInstance> {
    const providers = new Map<string, ProviderInstance>()

    if (keys.openai) {
      providers.set("openai", createOpenAI({ apiKey: keys.openai }))
    }

    if (keys.groq) {
      providers.set("groq", createGroq({ apiKey: keys.groq }))
    }

    if (keys.openrouter) {
      providers.set("openrouter", createOpenRouter({ apiKey: keys.openrouter }))
    }

    return providers
  }

  /**
   * Get a model by name
   * Supports 3 formats:
   * 1. "openai#gpt-4o" - with provider prefix
   * 2. "gpt-4o" - auto-detect provider
   * 3. Model must be in user's allowed list
   *
   * @param name - Model name/ID to retrieve
   * @param options - Optional provider-specific parameters (e.g., { reasoning: { effort: "medium" } })
   */
  model(name: string, options?: ProviderOptions): LanguageModel {
    // Find model in catalog
    const catalogEntry = findModel(name)
    if (!catalogEntry) {
      throw new Error(`Model not found: ${name}`)
    }

    // Check if model is in user's allowed list
    let resolvedName = toNormalModelName(catalogEntry.model)
    if (!this.allowedModels.includes(name)) {
      // Try to find by auto-detection (match against full IDs in allowed list)
      const found = this.allowedModels.find(allowed => {
        if (allowed === name) return true
        if (allowed.endsWith(`#${name}`)) return true
        return false
      })

      if (!found) {
        throw new Error(`Model "${name}" not in user's allowed models`)
      }
      resolvedName = toNormalModelName(found) // use the full ID
    }

    // Check provider is configured
    const provider = this.providers.get(catalogEntry.provider)
    if (!provider) {
      throw new Error(`Provider not configured: ${catalogEntry.provider}`)
    }

    // Return ai sdk model with modelId property for testing/tracking
    // Pass options through to provider (e.g., reasoning configuration for OpenRouter)
    let model: LanguageModel

    if (catalogEntry.provider === "openrouter") {
      model = provider(resolvedName, options)
    } else if (catalogEntry.provider === "openai") {
      model = openai(resolvedName)
    } else if (catalogEntry.provider === "groq") {
      model = groq(resolvedName)
    } else {
      throw new Error(`Unsupported provider: ${catalogEntry.provider}`)
    }

    // Add modelId for tracking without type assertion by using Object.defineProperty
    Object.defineProperty(model, "modelId", {
      value: catalogEntry.id,
      writable: false,
      enumerable: true,
      configurable: false,
    })

    return model
  }

  /**
   * Select model by tier
   * Picks from user's allowed models only
   * @param tierName - Tier name (cheap/fast/smart/balanced)
   * @param options - Optional provider-specific parameters
   */
  tier(tierName: TierName, options?: ProviderOptions): LanguageModel {
    const selected = selectModelForTier(tierName, this.allowedModels)
    return this.model(selected.id, options)
  }

  /**
   * Resolve a tier name or model name to either a LanguageModel or catalog ID string
   * Automatically detects whether input is a tier or model name
   *
   * @param nameOrTier - Tier name (cheap/fast/smart/balanced) or model name/ID
   * @param options - Optional configuration
   *   - type: Enforce 'tier' or 'model', throws if type mismatch
   *   - outputType: 'ai-sdk-model-func' (default) returns LanguageModel, 'string' returns catalog ID
   *   - providerOptions: Provider-specific parameters (e.g., { reasoning: { effort: "medium" } })
   * @returns LanguageModel instance or catalog ID string (provider#model format)
   *
   * @throws {Error} If type is specified and input doesn't match expected type
   * @throws {Error} If model not found (passed through from model() method)
   *
   * @example
   * // Return LanguageModel (default)
   * models.resolve("cheap")                                        // → LanguageModel
   * models.resolve("openai#gpt-4o")                                // → LanguageModel
   * models.resolve("cheap", { type: "tier" })                      // → LanguageModel (enforced tier)
   *
   * // Return catalog ID string
   * models.resolve("cheap", { outputType: "string" })              // → "openai#gpt-4o" (selected for cheap tier)
   * models.resolve("gpt-4o", { outputType: "string" })             // → "openai#gpt-4o"
   * models.resolve("openai#gpt-4o", { outputType: "string" })      // → "openai#gpt-4o"
   *
   * // With reasoning configuration
   * models.resolve("gpt-4o", { providerOptions: { reasoning: { effort: "medium" } } })
   */
  resolve(
    nameOrTier: string,
    options: { outputType: "string"; type?: "tier" | "model"; providerOptions?: ProviderOptions },
  ): string
  resolve(
    nameOrTier: string,
    options?: { outputType?: "ai-sdk-model-func"; type?: "tier" | "model"; providerOptions?: ProviderOptions },
  ): LanguageModel
  resolve(
    nameOrTier: string,
    options?: {
      outputType?: "ai-sdk-model-func" | "string"
      type?: "tier" | "model"
      providerOptions?: ProviderOptions
    },
  ): LanguageModel | string {
    const tierOptions = tierNameSchema.options
    const isTier = tierOptions.includes(nameOrTier.toLowerCase() as TierName)
    const outputType = options?.outputType ?? "ai-sdk-model-func"
    const enforcedType = options?.type
    const providerOptions = options?.providerOptions

    // Strict mode: enforce type if specified
    if (enforcedType === "tier" && !isTier) {
      throw new Error(
        `Expected tier name (${tierOptions.join(", ")}), but got: "${nameOrTier}". Use models.model() for model names or remove the type parameter for auto-detection.`,
      )
    }

    if (enforcedType === "model" && isTier) {
      throw new Error(
        `Expected model name, but got tier name: "${nameOrTier}". Use models.tier() for tier selection or remove the type parameter for auto-detection.`,
      )
    }

    // Route based on detection and output type
    if (outputType === "string") {
      // Return catalog ID string (provider#model format)
      if (isTier) {
        // For tier: determine which model would be selected, return its ID
        const selectedModel = selectModelForTier(nameOrTier.toLowerCase() as TierName, this.allowedModels)
        return selectedModel.id
      }
      // For model name: normalize to catalog ID and validate against allowlist
      const catalogEntry = findModel(nameOrTier)
      if (!catalogEntry) {
        throw new Error(`Model not found: ${nameOrTier}`)
      }
      // Check if model is in user's allowed list
      if (!this.allowedModels.includes(catalogEntry.id)) {
        throw new Error(`Model "${catalogEntry.id}" not in user's allowed models`)
      }
      return catalogEntry.id
    }

    // Return LanguageModel (default behavior)
    if (isTier) {
      return this.tier(nameOrTier.toLowerCase() as TierName, providerOptions)
    }
    return this.model(nameOrTier, providerOptions)
  }

  /**
   * Get the full catalog (all models, not just user's)
   * Returns a defensive copy to prevent mutations
   */
  getCatalog(): ModelEntry[] {
    // Return a deep copy to prevent mutations
    return JSON.parse(JSON.stringify(MODEL_CATALOG))
  }
}
