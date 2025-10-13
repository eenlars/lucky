/**
 * Default Model Tier Configuration
 *
 * Provides provider-aware default tiers that are validated against the model catalog
 * at module load time. Each provider gets its own tier mapping so that switching the
 * default provider automatically routes tier names (nano/medium/etc.) to models that
 * actually belong to that provider.
 */

import type { LuckyProvider } from "@lucky/shared"
import { findModelByName } from "../pricing/model-lookup"
import type { ModelSpec, TierConfig } from "../types"

const EXPECTED_TIERS = [
  "nano",
  "low",
  "medium",
  "high",
  "default",
  "fitness",
  "reasoning",
  "summary",
  "fallback",
] as const

type TierName = (typeof EXPECTED_TIERS)[number]
type TierModelMap = Record<TierName, string>

const PROVIDER_TIER_MODEL_NAMES: Record<LuckyProvider, TierModelMap> = {
  openai: {
    nano: "gpt-5-nano",
    low: "gpt-4o-mini",
    medium: "gpt-4o",
    high: "gpt-4o",
    default: "gpt-5-nano",
    fitness: "gpt-4o-mini",
    reasoning: "gpt-4o",
    summary: "gpt-4o-mini",
    fallback: "gpt-4o-mini",
  },
  openrouter: {
    nano: "openai/gpt-4.1-nano",
    low: "openai/gpt-4o-mini",
    medium: "anthropic/claude-sonnet-4",
    high: "openai/gpt-5",
    default: "openai/gpt-4.1-nano",
    fitness: "openai/gpt-4o-mini",
    reasoning: "anthropic/claude-sonnet-4",
    summary: "openai/gpt-4o-mini",
    fallback: "openai/gpt-4o-mini",
  },
  groq: {
    nano: "openai/gpt-oss-20b",
    low: "openai/gpt-oss-20b",
    medium: "openai/gpt-oss-120b",
    high: "openai/gpt-oss-120b",
    default: "openai/gpt-oss-20b",
    fitness: "openai/gpt-oss-20b",
    reasoning: "openai/gpt-oss-120b",
    summary: "openai/gpt-oss-20b",
    fallback: "openai/gpt-oss-20b",
  },
}

function validateModel(apiName: string, tierName: TierName, provider: LuckyProvider): ModelSpec {
  const entry = findModelByName(apiName)

  if (!entry) {
    throw new Error(
      `Tier "${tierName}" for provider "${provider}" references unknown model "${apiName}". Add this model to MODEL_CATALOG in packages/models/src/pricing/catalog.ts`,
    )
  }

  if (entry.provider !== provider) {
    throw new Error(
      `Tier "${tierName}" references model "${apiName}" but catalog provider is "${entry.provider}". Update PROVIDER_TIER_MODEL_NAMES for provider "${provider}" to use provider-aligned models.`,
    )
  }

  if (!entry.active) {
    throw new Error(
      `Tier "${tierName}" references inactive model "${apiName}" for provider "${provider}". Either activate it in MODEL_CATALOG or choose a different model for this tier.`,
    )
  }

  return {
    provider: entry.provider,
    model: entry.model,
  }
}

function buildProviderTierConfig(provider: LuckyProvider): Record<TierName, TierConfig> {
  const mapping = PROVIDER_TIER_MODEL_NAMES[provider]
  if (!mapping) {
    throw new Error(`No tier mapping defined for provider "${provider}"`)
  }

  return EXPECTED_TIERS.reduce<Record<TierName, TierConfig>>(
    (acc, tierName) => {
      const apiName = mapping[tierName]
      if (!apiName) {
        throw new Error(`Provider "${provider}" missing tier definition for "${tierName}"`)
      }

      acc[tierName] = {
        strategy: "first",
        models: [validateModel(apiName, tierName, provider)],
      }
      return acc
    },
    {} as Record<TierName, TierConfig>,
  )
}

function validateTierConsistency(provider: LuckyProvider, tiers: Record<TierName, TierConfig>): void {
  const actualTiers = Object.keys(tiers)

  const missing = EXPECTED_TIERS.filter(tier => !actualTiers.includes(tier))
  if (missing.length > 0) {
    throw new Error(`Provider "${provider}" missing required tiers: ${missing.join(", ")}`)
  }

  const unexpected = actualTiers.filter(tier => !EXPECTED_TIERS.includes(tier as TierName))
  if (unexpected.length > 0) {
    console.warn(`⚠️  Provider "${provider}" has unexpected tier names: ${unexpected.join(", ")}`)
  }

  for (const [tierName, tierConfig] of Object.entries(tiers)) {
    if (!tierConfig.strategy) {
      throw new Error(`Tier "${tierName}" for provider "${provider}" is missing execution strategy`)
    }
    if (!tierConfig.models || tierConfig.models.length === 0) {
      throw new Error(`Tier "${tierName}" for provider "${provider}" has no models configured`)
    }
    if (!tierConfig.models[0].provider || !tierConfig.models[0].model) {
      throw new Error(`Tier "${tierName}" for provider "${provider}" contains invalid model spec`)
    }
  }
}

const providerModelTiers: Record<LuckyProvider, Record<TierName, TierConfig>> = {
  openai: buildProviderTierConfig("openai"),
  openrouter: buildProviderTierConfig("openrouter"),
  groq: buildProviderTierConfig("groq"),
}

try {
  for (const provider of Object.keys(providerModelTiers) as LuckyProvider[]) {
    validateTierConsistency(provider, providerModelTiers[provider])
  }
  console.log(
    `✓ Model tiers validated against MODEL_CATALOG for providers: ${(
      Object.keys(providerModelTiers) as LuckyProvider[]
    ).join(", ")}`,
  )
} catch (error) {
  console.error("✗ Model tier validation failed:", error)
  throw error
}

export const PROVIDER_MODEL_TIERS: Record<LuckyProvider, Record<TierName, TierConfig>> = providerModelTiers

/**
 * Backwards-compatible default (OpenAI) tier configuration.
 */
export const DEFAULT_MODEL_TIERS = PROVIDER_MODEL_TIERS.openai

export function getDefaultModelTiersForProvider(provider: LuckyProvider): Record<TierName, TierConfig> {
  return PROVIDER_MODEL_TIERS[provider] ?? PROVIDER_MODEL_TIERS.openai
}

export function getTierModelName(tierName: string, provider: LuckyProvider = "openai"): string | undefined {
  const tiers = getDefaultModelTiersForProvider(provider)
  const tier = tiers[tierName as TierName]
  return tier?.models[0]?.model
}

export function hasTier(tierName: string, provider: LuckyProvider = "openai"): boolean {
  const tiers = getDefaultModelTiersForProvider(provider)
  return tierName in tiers
}

export function getAllTierNames(provider: LuckyProvider = "openai"): string[] {
  return Object.keys(getDefaultModelTiersForProvider(provider))
}
