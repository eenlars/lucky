/**
 * UserModels - Per-user model access with restricted model list
 */

import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import type { LanguageModel } from "ai"

import type { TierName } from "@lucky/shared"
import { providerNameSchema } from "@lucky/shared"

import type { ModelEntry } from "@lucky/shared"
import { MODEL_CATALOG } from "./llm-catalog/catalog"
import { findModelById, findModelByName } from "./llm-catalog/catalog-queries"
import type { FallbackKeys } from "./types"

type ProviderInstance =
  | ReturnType<typeof createOpenAI>
  | ReturnType<typeof createGroq>
  | ReturnType<typeof createOpenRouter>

export class UserModels {
  private userId: string
  private mode: "byok" | "shared"
  private allowedModels: string[]
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
    this.allowedModels = allowedModels

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
  model(name: string): LanguageModel {
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
  tier(tierName: TierName): LanguageModel {
    if (this.allowedModels.length === 0) {
      throw new Error("No models configured for tier selection")
    }

    // get catalog entries for user's models
    const userModels = this.allowedModels.map(id => findModelById(id)).filter((m): m is ModelEntry => m !== undefined)

    if (userModels.length === 0) {
      throw new Error("No valid models found in user's configuration")
    }

    let selected: ModelEntry | undefined

    switch (tierName) {
      case "cheap":
        // lowest cost (average of input/output)
        selected = userModels.reduce((min, m) => ((m.input + m.output) / 2 < (min.input + min.output) / 2 ? m : min))
        break

      case "fast":
        // fast speed, then cheapest among fast
        {
          const fastModels = userModels.filter(m => m.speed === "fast")
          if (fastModels.length > 0) {
            selected = fastModels.reduce((min, m) =>
              (m.input + m.output) / 2 < (min.input + min.output) / 2 ? m : min,
            )
          } else {
            // no fast models, pick cheapest overall
            selected = userModels.reduce((min, m) =>
              (m.input + m.output) / 2 < (min.input + min.output) / 2 ? m : min,
            )
          }
        }
        break

      case "smart":
        // highest intelligence
        selected = userModels.reduce((max, m) => (m.intelligence > max.intelligence ? m : max))
        break

      case "balanced":
        // balance between cost and intelligence
        // score = intelligence / avgCost (higher is better)
        selected = userModels.reduce((best, m) => {
          const avgCost = (m.input + m.output) / 2
          const score = m.intelligence / (avgCost || 0.1) // avoid division by zero
          const bestCost = (best.input + best.output) / 2
          const bestScore = best.intelligence / (bestCost || 0.1)
          return score > bestScore ? m : best
        })
        break

      default:
        throw new Error(`Unknown tier: ${tierName}`)
    }

    if (!selected) {
      throw new Error(`Could not select model for tier: ${tierName}`)
    }

    return this.model(selected.id)
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
