/**
 * Tier-based model selection logic
 * Pure functions for selecting models based on tier strategy
 */

import type { ModelEntry, TierName } from "@lucky/shared"
import { findModelById } from "./llm-catalog/catalog-queries"

/**
 * Select the best model for a given tier from a list of allowed models
 * Uses different strategies per tier:
 * - cheap: lowest average cost
 * - fast: fast speed + lowest cost among fast models
 * - smart: highest intelligence
 * - balanced: best intelligence/cost ratio
 *
 * @param tierName - Tier name (cheap/fast/smart/balanced)
 * @param allowedModelIds - List of catalog IDs the user has access to
 * @returns Selected model entry
 * @throws {Error} If no models configured or tier unknown
 */
export function selectModelForTier(tierName: TierName, allowedModelIds: readonly string[]): ModelEntry {
  if (allowedModelIds.length === 0) {
    throw new Error("No models configured for tier selection")
  }

  // Get catalog entries for allowed models
  const userModels = allowedModelIds.map(id => findModelById(id)).filter((m): m is ModelEntry => m !== undefined)

  if (userModels.length === 0) {
    throw new Error("No valid models found in user's configuration")
  }

  let selected: ModelEntry | undefined

  switch (tierName) {
    case "cheap":
      // lowest cost (average of input/output)
      selected = userModels.reduce((min, m) => ((m.input + m.output) / 2 < (min.input + min.output) / 2 ? m : min))
      break

    case "fast": {
      // fast speed, then cheapest among fast
      const fastModels = userModels.filter(m => m.speed === "fast")
      if (fastModels.length > 0) {
        selected = fastModels.reduce((min, m) => ((m.input + m.output) / 2 < (min.input + min.output) / 2 ? m : min))
      } else {
        // no fast models, pick cheapest overall
        selected = userModels.reduce((min, m) => ((m.input + m.output) / 2 < (min.input + min.output) / 2 ? m : min))
      }
      break
    }

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

  return selected
}
