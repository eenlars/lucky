/**
 * Builds @lucky/models tier configuration from core's DEFAULT_MODELS.
 * Maps semantic tier names (nano, low, medium, etc.) to provider/model specs.
 */

import { getDefaultModels } from "@core/core-config/coreConfig"
import { getCurrentProvider } from "@core/utils/spending/provider"
import type { TierConfig } from "@lucky/models"

/**
 * Build tier configuration from core's default models.
 * Each tier uses 'first' strategy with a single model.
 */
export function buildTierConfigFromDefaults(): Record<string, TierConfig> {
  const coreModels = getDefaultModels()
  const provider = getCurrentProvider()

  return {
    nano: {
      strategy: "first",
      models: [{ provider, model: coreModels.nano }],
    },
    low: {
      strategy: "first",
      models: [{ provider, model: coreModels.low }],
    },
    medium: {
      strategy: "first",
      models: [{ provider, model: coreModels.medium }],
    },
    high: {
      strategy: "first",
      models: [{ provider, model: coreModels.high }],
    },
    default: {
      strategy: "first",
      models: [{ provider, model: coreModels.default }],
    },
    fitness: {
      strategy: "first",
      models: [{ provider, model: coreModels.fitness }],
    },
    reasoning: {
      strategy: "first",
      models: [{ provider, model: coreModels.reasoning }],
    },
    summary: {
      strategy: "first",
      models: [{ provider, model: coreModels.summary }],
    },
    fallback: {
      strategy: "first",
      models: [{ provider, model: coreModels.fallback }],
    },
  }
}
