/**
 * UserModels - Per-user model access with restricted model list
 */

import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import type { ProviderOptions } from "@ai-sdk/provider-utils"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import type { LanguageModel } from "ai"

import { type TierName, tierNameSchema } from "@lucky/shared"

import type { FallbackKeys } from "@lucky/models/types"
import type { ModelEntry } from "@lucky/shared"
import { MODEL_CATALOG } from "./llm-catalog/catalog"
import { findModel } from "./llm-catalog/catalog-queries"
import { selectModelForTier } from "./tier-selection"

export class UserModels {
  private userId: string
  private mode: "byok" | "shared"
  private allowedModels: readonly string[]
  private allowedModelSet: Set<string>
  private apiKeys: FallbackKeys
  private fallbackKeys: FallbackKeys

  constructor(
    userId: string,
    mode: "byok" | "shared",
    allowedModels: string[],
    apiKeys: FallbackKeys,
    fallbackKeys: FallbackKeys,
  ) {
    this.userId = userId
    this.mode = mode
    const trimmed = allowedModels.map(m => (typeof m === "string" ? m.trim() : (m as any)))
    this.allowedModels = Object.freeze([...trimmed])
    this.allowedModelSet = new Set<string>(this.allowedModels)

    // Validate BYOK mode has keys
    if (mode === "byok" && (!apiKeys || Object.keys(apiKeys).length === 0)) {
      throw new Error("BYOK mode requires apiKeys")
    }

    this.apiKeys = apiKeys
    this.fallbackKeys = fallbackKeys
  }

  /**
   * Get a model by name
   * Supports 3 formats:
   * 1. "gpt-4o" - with gateway prefix
   * 2. "gpt-4o" - auto-detect gateway
   * 3. Model must be in user's allowed list
   *
   * @param name - Model name/ID to retrieve
   * @param options - Optional gateway-specific parameters (e.g., { reasoning: { effort: "medium" } })
   */
  model(name: string, options?: ProviderOptions): LanguageModel {
    // In BYOK mode, enforce exact string match against allowlist to prevent case/format bypass
    if (this.mode === "byok") {
      const input = typeof name === "string" ? name : String(name)
      if (!this.allowedModelSet.has(input)) {
        throw new Error(`Model "${name}" not in user's allowed models`)
      }
    }

    // Find model in catalog
    const catalogEntry = findModel(name)
    if (!catalogEntry) {
      throw new Error(`[pkg:models:model] Model not found: ${name}`)
    }

    // Check if model is in user's allowed list
    if (!this.isModelAllowed(catalogEntry)) {
      throw new Error(`Model "${name}" not in user's allowed models`)
    }

    const resolvedName = catalogEntry.gatewayModelId
    const keys = this.mode === "byok" ? this.apiKeys : this.fallbackKeys
    const apiKey = keys[catalogEntry.gateway]

    if (!apiKey) {
      throw new Error(`API key not configured for gateway: ${catalogEntry.gateway}`)
    }

    let model: LanguageModel
    if (catalogEntry.gateway === "openai-api") {
      model = createOpenAI({ apiKey })(resolvedName)
    } else if (catalogEntry.gateway === "groq-api") {
      model = createGroq({ apiKey })(resolvedName)
    } else if (catalogEntry.gateway === "openrouter-api") {
      model = createOpenRouter({ apiKey })(resolvedName, options)
    } else {
      throw new Error(`Unsupported gateway: ${catalogEntry.gateway}`)
    }

    Object.defineProperty(model, "modelId", {
      value: catalogEntry.gatewayModelId,
      writable: false,
      enumerable: true,
      configurable: false,
    })

    return model
  }

  private isModelAllowed(catalogEntry: ModelEntry): boolean {
    // Allow only the gatewayModelId (no legacy '#'-based IDs)
    return this.allowedModelSet.has(catalogEntry.gatewayModelId)
  }

  /**
   * Select model by tier
   * Picks from user's allowed models only
   * @param tierName - Tier name (cheap/fast/smart/balanced)
   * @param options - Optional gateway-specific parameters
   */
  tier(tierName: TierName, options?: ProviderOptions): LanguageModel {
    const selected = selectModelForTier(tierName, this.allowedModels)
    return this.model(selected.gatewayModelId, options)
  }

  /**
   * Resolve a tier name or model name to either a LanguageModel or catalog ID string
   * Automatically detects whether input is a tier or model name
   *
   * @param nameOrTier - Tier name (cheap/fast/smart/balanced) or model name/ID
   * @param options - Optional configuration
   *   - type: Enforce 'tier' or 'model', throws if type mismatch
   *   - outputType: 'ai-sdk-model-func' (default) returns LanguageModel, 'string' returns catalog ID
   *   - gatewayOptions: Gateway-specific parameters (e.g., { reasoning: { effort: "medium" } })
   * @returns LanguageModel instance or catalog ID string (gateway#model format)
   *
   * @throws {Error} If type is specified and input doesn't match expected type
   * @throws {Error} If model not found (passed through from model() method)
   *
   * @example
   * // Return LanguageModel (default)
   * models.resolve("cheap")                                        // → LanguageModel
   * models.resolve("gpt-4o")                                // → LanguageModel
   * models.resolve("cheap", { type: "tier" })                      // → LanguageModel (enforced tier)
   *
   * // Return catalog ID string
   * models.resolve("cheap", { outputType: "string" })              // → "gpt-4o" (selected for cheap tier)
   * models.resolve("gpt-4o", { outputType: "string" })             // → "gpt-4o"
   * models.resolve("gpt-4o", { outputType: "string" })      // → "gpt-4o"
   *
   * // With reasoning configuration
   * models.resolve("gpt-4o", { gatewayOptions: { reasoning: { effort: "medium" } } })
   */
  resolve(
    nameOrTier: string,
    options: { outputType: "string"; type?: "tier" | "model"; gatewayOptions?: ProviderOptions },
  ): string
  resolve(
    nameOrTier: string,
    options?: { outputType?: "ai-sdk-model-func"; type?: "tier" | "model"; gatewayOptions?: ProviderOptions },
  ): LanguageModel
  resolve(
    nameOrTier: string,
    options?: {
      outputType?: "ai-sdk-model-func" | "string"
      type?: "tier" | "model"
      gatewayOptions?: ProviderOptions
    },
  ): LanguageModel | string {
    const tierOptions = tierNameSchema.options
    const isTier = tierOptions.includes(nameOrTier.toLowerCase() as TierName)
    const outputType = options?.outputType ?? "ai-sdk-model-func"
    const enforcedType = options?.type
    const gatewayOptions = options?.gatewayOptions

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
      // Return catalog ID string (gateway#model format)
      if (isTier) {
        // For tier: determine which model would be selected, return its ID
        const selectedModel = selectModelForTier(nameOrTier.toLowerCase() as TierName, this.allowedModels)
        return selectedModel.gatewayModelId
      }
      // For model name: normalize to catalog ID and validate against allowlist
      const catalogEntry = findModel(nameOrTier)
      if (!catalogEntry) {
        throw new Error(`Model not found: ${nameOrTier}`)
      }
      // Check if model is in user's allowed list
      if (!this.isModelAllowed(catalogEntry)) {
        throw new Error(`Model "${nameOrTier}" not in user's allowed models`)
      }
      return catalogEntry.gatewayModelId
    }

    // Return LanguageModel (default behavior)
    if (isTier) {
      return this.tier(nameOrTier.toLowerCase() as TierName, gatewayOptions)
    }
    return this.model(nameOrTier, gatewayOptions)
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
