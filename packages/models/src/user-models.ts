/**
 * UserModels - Per-user model access with restricted model list
 */

import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModelV2 } from "@ai-sdk/provider"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

import { type TierName, providerNameSchema, tierNameSchema } from "@lucky/shared"

import type { ModelEntry } from "@lucky/shared"
import { MODEL_CATALOG } from "./llm-catalog/catalog"
import { findModelById, findModelByName } from "./llm-catalog/catalog-queries"
import { selectModelForTier } from "./tier-selection"
import type { FallbackKeys } from "./types"

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
   */
  model(name: string): LanguageModelV2 {
    // First, check if the model exists in the catalog at all
    // This helps us give better error messages
    let catalogEntry = name.includes("#") ? findModelById(name) : findModelByName(name)

    // If the model has a # but isn't in the catalog, it's probably a malformed/unknown model
    if (!catalogEntry && name.includes("#")) {
      // Check if it's malformed (e.g., spaces instead of #) or just unknown
      const [provider] = name.split("#")

      // check if the provider part exists in our provider list from contracts
      const knownProviders: readonly string[] = providerNameSchema.options
      if (!knownProviders.includes(provider)) {
        // if this model is in the allowlist, the provider is unknown/not configured
        // otherwise, the model itself is not in the allowlist (different error)
        if (this.allowedModels.includes(name)) {
          throw new Error(`Provider not configured: ${provider}`)
        }
      }

      // Model not found in catalog
      throw new Error(`Model not found: ${name}`)
    }

    // check if model is in user's allowed list
    let resolvedName = name
    if (!this.allowedModels.includes(name)) {
      // try to find by auto-detection
      const found = this.allowedModels.find(allowed => {
        if (allowed === name) return true
        if (allowed.endsWith(`#${name}`)) return true
        return false
      })

      if (!found) {
        // Special case: if it looks malformed (has spaces), give "Model not found" error
        if (name.includes(" ") && !name.includes("#")) {
          throw new Error(`Model not found: ${name}`)
        }
        throw new Error(`Model "${resolvedName}" not in user's allowed models`)
      }
      resolvedName = found // use the full ID
    }

    // find model in catalog (again if needed)
    if (!catalogEntry) {
      catalogEntry = resolvedName.includes("#") ? findModelById(resolvedName) : findModelByName(resolvedName)
    }

    if (!catalogEntry) {
      throw new Error(`Model not found: ${resolvedName}`)
    }

    // check provider is configured
    const provider = this.providers.get(catalogEntry.provider)
    if (!provider) {
      throw new Error(`Provider not configured: ${catalogEntry.provider}`)
    }

    // return ai sdk model with modelId property for testing/tracking
    const model = provider(catalogEntry.model)
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
   */
  tier(tierName: TierName): LanguageModelV2 {
    const selected = selectModelForTier(tierName, this.allowedModels)
    return this.model(selected.id)
  }

  /**
   * Resolve a tier name or model name to either a LanguageModel or catalog ID string
   * Automatically detects whether input is a tier or model name
   *
   * @param nameOrTier - Tier name (cheap/fast/smart/balanced) or model name/ID
   * @param options - Optional configuration
   *   - type: Enforce 'tier' or 'model', throws if type mismatch
   *   - outputType: 'ai-sdk-model-func' (default) returns LanguageModel, 'string' returns catalog ID
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
   */
  resolve(nameOrTier: string, options: { outputType: "string"; type?: "tier" | "model" }): string
  resolve(nameOrTier: string, options?: { outputType?: "ai-sdk-model-func"; type?: "tier" | "model" }): LanguageModelV2
  resolve(
    nameOrTier: string,
    options?: { outputType?: "ai-sdk-model-func" | "string"; type?: "tier" | "model" },
  ): LanguageModelV2 | string {
    const tierOptions = tierNameSchema.options
    const isTier = tierOptions.includes(nameOrTier.toLowerCase() as TierName)
    const outputType = options?.outputType ?? "ai-sdk-model-func"
    const enforcedType = options?.type

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
      const catalogEntry = findModelByName(nameOrTier)
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
      return this.tier(nameOrTier.toLowerCase() as TierName)
    }
    return this.model(nameOrTier)
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
