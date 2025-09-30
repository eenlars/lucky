/**
 * Tier Configuration Builder
 *
 * Dynamically generates models registry tier configuration from DEFAULT_MODELS.
 * This ensures the models registry always uses the same tier models as the rest of the system.
 */

import { DEFAULT_MODELS, MODEL_CONFIG } from "@examples/settings/models"
import type { TierConfig, ModelSpec } from "@lucky/models"
import type { ModelTier } from "./tier-resolver"

/**
 * Parse a model string into provider and model name
 *
 * @example
 * parseModelString('openai/gpt-4.1-mini') => { provider: 'openrouter', model: 'openai/gpt-4.1-mini' }
 * parseModelString('google/gemini-2.5-flash-lite') => { provider: 'openrouter', model: 'google/gemini-2.5-flash-lite' }
 */
function parseModelString(modelString: string): ModelSpec {
  // For models from OpenRouter, the full path includes the vendor
  // e.g., "openai/gpt-4.1-mini" on OpenRouter should be passed as-is

  // If the model doesn't contain a slash, it's a direct model on the current provider
  if (!modelString.includes("/")) {
    return {
      provider: MODEL_CONFIG.provider,
      model: modelString,
    }
  }

  // For OpenRouter models, we use 'openrouter' as provider and full path as model
  // For OpenAI/Groq, we use the provider directly
  if (MODEL_CONFIG.provider === "openrouter") {
    return {
      provider: "openrouter",
      model: modelString,
    }
  } else if (MODEL_CONFIG.provider === "openai") {
    return {
      provider: "openai",
      model: modelString,
    }
  } else if (MODEL_CONFIG.provider === "groq") {
    return {
      provider: "groq",
      model: modelString,
    }
  }

  // Fallback: use current provider
  return {
    provider: MODEL_CONFIG.provider,
    model: modelString,
  }
}

/**
 * Get strategy for a tier
 * Some tiers should use racing for speed, others use first for reliability
 */
function getStrategyForTier(tier: ModelTier): TierConfig["strategy"] {
  // Fast operations should race
  if (tier === "nano" || tier === "summary") {
    return "race"
  }

  // Everything else uses first for now
  // Can be customized per tier as needed
  return "first"
}

/**
 * Build tier configuration from DEFAULT_MODELS
 */
export function buildTierConfig(): Record<string, TierConfig> {
  const provider = MODEL_CONFIG.provider
  const providerDefaults = DEFAULT_MODELS[provider]

  const tierConfig: Record<string, TierConfig> = {}

  // Build a tier config for each tier in DEFAULT_MODELS
  for (const [tierName, modelString] of Object.entries(providerDefaults)) {
    const tier = tierName as ModelTier
    const modelSpec = parseModelString(modelString as string)
    const strategy = getStrategyForTier(tier)

    tierConfig[tier] = {
      strategy,
      models: [modelSpec],
    }
  }

  return tierConfig
}

/**
 * Get default tier name (usually 'medium' or 'default')
 */
export function getDefaultTierName(): string {
  const provider = MODEL_CONFIG.provider
  const providerDefaults = DEFAULT_MODELS[provider]

  // If 'default' tier exists, use it
  if ("default" in providerDefaults) {
    return "default"
  }

  // Otherwise use 'medium' as fallback
  return "medium"
}