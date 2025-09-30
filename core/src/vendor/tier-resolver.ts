/**
 * Tier Resolution System
 *
 * Automatically maps model names to tiers based on current provider configuration.
 * If a requested model matches a tier's configured model, it resolves to that tier.
 *
 * Example: If "openai/gpt-4.1-mini" is configured as the "medium" tier model,
 * then requesting "openai/gpt-4.1-mini" will automatically use "tier:medium"
 */

import { DEFAULT_MODELS, MODEL_CONFIG } from "@examples/settings/models"
import type { LuckyProvider } from "@core/utils/spending/provider"

export type ModelTier =
  | "summary"
  | "nano"
  | "low"
  | "medium"
  | "high"
  | "default"
  | "fitness"
  | "reasoning"
  | "fallback"

/**
 * Build reverse lookup map: model name -> tier name
 */
function buildModelToTierMap(provider: LuckyProvider): Map<string, ModelTier> {
  const map = new Map<string, ModelTier>()
  const providerDefaults = DEFAULT_MODELS[provider]

  for (const [tier, modelName] of Object.entries(providerDefaults)) {
    map.set(modelName as string, tier as ModelTier)
  }

  return map
}

/**
 * Tier resolver with caching
 */
class TierResolver {
  private cache = new Map<LuckyProvider, Map<string, ModelTier>>()

  /**
   * Get tier for a model name on current provider
   */
  getTierForModel(modelName: string): ModelTier | null {
    const provider = MODEL_CONFIG.provider
    return this.getTierForModelOnProvider(modelName, provider)
  }

  /**
   * Get tier for a model name on specific provider
   */
  getTierForModelOnProvider(
    modelName: string,
    provider: LuckyProvider,
  ): ModelTier | null {
    // Get or build cache for this provider
    let providerCache = this.cache.get(provider)
    if (!providerCache) {
      providerCache = buildModelToTierMap(provider)
      this.cache.set(provider, providerCache)
    }

    return providerCache.get(modelName) ?? null
  }

  /**
   * Check if a model name maps to a tier
   */
  isTierModel(modelName: string): boolean {
    return this.getTierForModel(modelName) !== null
  }

  /**
   * Get all tiers for current provider
   */
  getAllTiers(): ModelTier[] {
    const provider = MODEL_CONFIG.provider
    const providerDefaults = DEFAULT_MODELS[provider]
    return Object.keys(providerDefaults) as ModelTier[]
  }

  /**
   * Get model name for a tier on current provider
   */
  getModelForTier(tier: ModelTier): string | null {
    const provider = MODEL_CONFIG.provider
    return this.getModelForTierOnProvider(tier, provider)
  }

  /**
   * Get model name for a tier on specific provider
   */
  getModelForTierOnProvider(
    tier: ModelTier,
    provider: LuckyProvider,
  ): string | null {
    const providerDefaults = DEFAULT_MODELS[provider]
    return (providerDefaults[tier] as string) ?? null
  }

  /**
   * Resolve a model spec to either a tier or direct model
   *
   * If the model matches a tier model, returns "tier:name"
   * Otherwise returns the original model spec
   */
  resolveModelSpec(modelSpec: string): string {
    // If already a tier spec, return as-is
    if (modelSpec.startsWith("tier:")) {
      return modelSpec
    }

    // If user config, return as-is
    if (modelSpec.startsWith("user:")) {
      return modelSpec
    }

    // Extract model name from provider/model format
    let modelName = modelSpec
    if (modelSpec.includes("/")) {
      const parts = modelSpec.split("/")
      modelName = parts.slice(1).join("/") // Everything after first /
    }

    // Check if this model maps to a tier
    const tier = this.getTierForModel(modelName)
    if (tier) {
      return `tier:${tier}`
    }

    // Not a tier model, return original spec
    return modelSpec
  }

  /**
   * Clear cache (useful for testing or when config changes)
   */
  clearCache(): void {
    this.cache.clear()
  }
}

// Singleton instance
export const tierResolver = new TierResolver()

/**
 * Helper to check if a string is a valid tier name
 */
export function isValidTier(tier: string): tier is ModelTier {
  const validTiers: Set<string> = new Set([
    "summary",
    "nano",
    "low",
    "medium",
    "high",
    "default",
    "fitness",
    "reasoning",
    "fallback",
  ])
  return validTiers.has(tier)
}