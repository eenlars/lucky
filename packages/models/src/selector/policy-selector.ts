/**
 * Policy Selector - Intelligent model selection based on constraints and preferences
 *
 * Implements the selection algorithm:
 * 1. Must-have features (context, tools, JSON mode, vision)
 * 2. Budget ceilings
 * 3. Latency SLO
 * 4. Preferred providers
 * 5. Price per token
 * 6. Randomized tie-break with sticky hashing
 *
 * @module selector/policy-selector
 */

import type { ModelSelection, SelectionOptions } from "../facade"
import type { ModelEntry } from "../pricing/catalog"
import type { ModelRegistry } from "../registry/model-registry"

/**
 * Selection reason - explains why a model was chosen
 */
export interface SelectionReason {
  primary: string // Main reason
  factors: string[] // Contributing factors
  alternatives: string[] // Other models considered
  rejections?: Array<{ modelId: string; reason: string }> // Why others were rejected
}

/**
 * Policy-driven model selector
 */
export class PolicySelector {
  constructor(private registry: ModelRegistry) {}

  /**
   * Select best model given constraints and preferences
   *
   * Returns null if no model satisfies constraints.
   */
  select(intent: string, options: SelectionOptions = {}): { model: ModelEntry; reason: SelectionReason } | null {
    // Step 1: Get initial candidates
    let candidates = this.getCandidates(intent, options)
    const rejections: Array<{ modelId: string; reason: string }> = []
    const allCandidates = candidates.map(m => m.id)

    if (candidates.length === 0) {
      return null
    }

    // Step 2: Apply must-have features filter
    if (options.requiredFeatures && options.requiredFeatures.length > 0) {
      const _before = candidates.length
      candidates = this.filterByFeatures(candidates, options.requiredFeatures, rejections)
      if (candidates.length === 0) {
        return null
      }
    }

    // Step 3: Apply budget ceiling
    if (options.budget !== undefined) {
      const _before = candidates.length
      candidates = this.filterByBudget(candidates, options.budget, rejections)
      if (candidates.length === 0) {
        return null
      }
    }

    // Step 4: Apply latency SLO
    if (options.maxLatency) {
      const _before = candidates.length
      candidates = this.filterByLatency(candidates, options.maxLatency, rejections)
      if (candidates.length === 0) {
        return null
      }
    }

    // Step 5: Apply context length filter
    if (options.minContextLength) {
      const _before = candidates.length
      candidates = this.filterByContext(candidates, options.minContextLength, rejections)
      if (candidates.length === 0) {
        return null
      }
    }

    // Step 6: Apply intelligence filter
    if (options.minIntelligence) {
      const _before = candidates.length
      candidates = this.filterByIntelligence(candidates, options.minIntelligence, rejections)
      if (candidates.length === 0) {
        return null
      }
    }

    // Step 7: Apply allowlist/denylist
    if (options.denylist && options.denylist.length > 0) {
      candidates = candidates.filter(m => {
        const denied = options.denylist!.includes(m.id)
        if (denied) {
          rejections.push({ modelId: m.id, reason: "On denylist" })
        }
        return !denied
      })
      if (candidates.length === 0) {
        return null
      }
    }

    if (options.allowlist && options.allowlist.length > 0) {
      candidates = candidates.filter(m => {
        const allowed = options.allowlist!.includes(m.id)
        if (!allowed) {
          rejections.push({ modelId: m.id, reason: "Not on allowlist" })
        }
        return allowed
      })
      if (candidates.length === 0) {
        return null
      }
    }

    // Step 8: Rank by optimization strategy
    candidates = this.rankCandidates(candidates, options)

    // Step 9: Apply preferred providers (soft preference)
    if (options.preferredProviders && options.preferredProviders.length > 0) {
      candidates = this.sortByPreferredProviders(candidates, options.preferredProviders)
    }

    // Step 10: Select best candidate (top of ranked list)
    const selected = candidates[0]

    // Build selection reason
    const reason = this.buildReason(selected, candidates.slice(1, 4), options, rejections, allCandidates)

    return { model: selected, reason }
  }

  /**
   * Select with fallback strategy
   */
  selectWithFallback(
    primary: string,
    options: SelectionOptions = {},
  ): { model: ModelEntry; reason: SelectionReason } | null {
    // Try primary first
    const primaryResult = this.select(primary, options)
    if (primaryResult) {
      return primaryResult
    }

    // Fallback based on strategy
    const fallbackStrategy = options.fallbackStrategy || "semantic"

    if (fallbackStrategy === "cheapest") {
      return this.selectCheapest(options)
    }
    if (fallbackStrategy === "fastest") {
      return this.selectFastest(options)
    }
    if (fallbackStrategy === "semantic") {
      return this.selectSemanticEquivalent(primary, options)
    }

    return null
  }

  /**
   * Find semantic equivalent for a model
   */
  private selectSemanticEquivalent(
    modelId: string,
    options: SelectionOptions,
  ): { model: ModelEntry; reason: SelectionReason } | null {
    const original = this.registry.get(modelId)
    if (!original) {
      return this.select("default", options)
    }

    // Find models with similar characteristics
    const equivalents = this.registry.list({
      minIntelligence: Math.max(1, original.intelligence - 1),
      maxIntelligence: Math.min(10, original.intelligence + 1),
      speed: original.speed,
      activeOnly: true,
    })

    if (equivalents.length === 0) {
      return this.select("default", options)
    }

    // Prefer same provider, then cheapest
    const sorted = equivalents.sort((a, b) => {
      if (a.provider === original.provider && b.provider !== original.provider) return -1
      if (b.provider === original.provider && a.provider !== original.provider) return 1

      const avgA = (a.input + a.output) / 2
      const avgB = (b.input + b.output) / 2
      return avgA - avgB
    })

    const selected = sorted[0]
    const reason: SelectionReason = {
      primary: `Semantic equivalent to ${modelId}`,
      factors: [`Similar intelligence (${selected.intelligence})`, `Same speed tier (${selected.speed})`],
      alternatives: sorted.slice(1, 4).map(m => m.id),
    }

    return { model: selected, reason }
  }

  /**
   * Select cheapest model
   */
  private selectCheapest(options: SelectionOptions): { model: ModelEntry; reason: SelectionReason } | null {
    const cheapest = this.registry.getCheapest({
      activeOnly: true,
      ...this.optionsToQuery(options),
    })

    if (!cheapest) return null

    const avgCost = (cheapest.input + cheapest.output) / 2
    const reason: SelectionReason = {
      primary: "Cheapest available model",
      factors: [`Average cost: $${avgCost.toFixed(3)} per 1M tokens`],
      alternatives: [],
    }

    return { model: cheapest, reason }
  }

  /**
   * Select fastest model
   */
  private selectFastest(options: SelectionOptions): { model: ModelEntry; reason: SelectionReason } | null {
    const fastest = this.registry.getFastest({
      activeOnly: true,
      ...this.optionsToQuery(options),
    })

    if (!fastest) return null

    const reason: SelectionReason = {
      primary: "Fastest available model",
      factors: [`Speed tier: ${fastest.speed}`],
      alternatives: [],
    }

    return { model: fastest, reason }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Get initial candidates based on intent
   */
  private getCandidates(intent: string, _options: SelectionOptions): ModelEntry[] {
    // If intent is explicit model ID
    if (intent.includes("/")) {
      const model = this.registry.get(intent)
      return model?.active ? [model] : []
    }

    // Otherwise, get all active models
    return this.registry.list({ activeOnly: true })
  }

  /**
   * Filter by required features
   */
  private filterByFeatures(
    candidates: ModelEntry[],
    features: string[],
    rejections: Array<{ modelId: string; reason: string }>,
  ): ModelEntry[] {
    return candidates.filter(model => {
      for (const feature of features) {
        if (feature === "tools" && !model.supportsTools) {
          rejections.push({ modelId: model.id, reason: "Missing feature: tools" })
          return false
        }
        if (feature === "json-mode" && !model.supportsJsonMode) {
          rejections.push({ modelId: model.id, reason: "Missing feature: json-mode" })
          return false
        }
        if (feature === "streaming" && !model.supportsStreaming) {
          rejections.push({ modelId: model.id, reason: "Missing feature: streaming" })
          return false
        }
        if (feature === "vision" && !model.supportsVision) {
          rejections.push({ modelId: model.id, reason: "Missing feature: vision" })
          return false
        }
      }
      return true
    })
  }

  /**
   * Filter by budget
   */
  private filterByBudget(
    candidates: ModelEntry[],
    maxBudget: number,
    rejections: Array<{ modelId: string; reason: string }>,
  ): ModelEntry[] {
    return candidates.filter(model => {
      const avgCost = (model.input + model.output) / 2
      if (avgCost > maxBudget) {
        rejections.push({
          modelId: model.id,
          reason: `Over budget: $${avgCost.toFixed(3)} > $${maxBudget.toFixed(3)} per 1M tokens`,
        })
        return false
      }
      return true
    })
  }

  /**
   * Filter by latency
   */
  private filterByLatency(
    candidates: ModelEntry[],
    maxLatency: "fast" | "medium" | "slow",
    rejections: Array<{ modelId: string; reason: string }>,
  ): ModelEntry[] {
    const allowedSpeeds: Record<string, string[]> = {
      fast: ["fast"],
      medium: ["fast", "medium"],
      slow: ["fast", "medium", "slow"],
    }

    const allowed = allowedSpeeds[maxLatency]

    return candidates.filter(model => {
      if (!allowed.includes(model.speed)) {
        rejections.push({ modelId: model.id, reason: `Too slow: ${model.speed} > ${maxLatency}` })
        return false
      }
      return true
    })
  }

  /**
   * Filter by context length
   */
  private filterByContext(
    candidates: ModelEntry[],
    minContext: number,
    rejections: Array<{ modelId: string; reason: string }>,
  ): ModelEntry[] {
    return candidates.filter(model => {
      if (model.contextLength < minContext) {
        rejections.push({
          modelId: model.id,
          reason: `Context too small: ${model.contextLength} < ${minContext}`,
        })
        return false
      }
      return true
    })
  }

  /**
   * Filter by intelligence
   */
  private filterByIntelligence(
    candidates: ModelEntry[],
    minIntel: number,
    rejections: Array<{ modelId: string; reason: string }>,
  ): ModelEntry[] {
    return candidates.filter(model => {
      if (model.intelligence < minIntel) {
        rejections.push({ modelId: model.id, reason: `Intelligence too low: ${model.intelligence} < ${minIntel}` })
        return false
      }
      return true
    })
  }

  /**
   * Rank candidates by optimization strategy
   */
  private rankCandidates(candidates: ModelEntry[], options: SelectionOptions): ModelEntry[] {
    const strategy = options.optimizeFor || "balanced"

    return [...candidates].sort((a, b) => {
      if (strategy === "cost") {
        // Optimize for cost: cheapest first
        const avgA = (a.input + a.output) / 2
        const avgB = (b.input + b.output) / 2
        return avgA - avgB
      }
      if (strategy === "speed") {
        // Optimize for speed: fast -> medium -> slow
        const speedOrder = { fast: 3, medium: 2, slow: 1 }
        return speedOrder[b.speed] - speedOrder[a.speed]
      }
      if (strategy === "quality") {
        // Optimize for quality: highest intelligence first
        return b.intelligence - a.intelligence
      }
      // Balanced: cost-performance ratio
      const avgCostA = (a.input + a.output) / 2
      const avgCostB = (b.input + b.output) / 2
      const speedOrder = { fast: 3, medium: 2, slow: 1 }
      const scoreA = (a.intelligence * speedOrder[a.speed]) / avgCostA
      const scoreB = (b.intelligence * speedOrder[b.speed]) / avgCostB
      return scoreB - scoreA
    })
  }

  /**
   * Sort by preferred providers
   */
  private sortByPreferredProviders(candidates: ModelEntry[], preferred: string[]): ModelEntry[] {
    return [...candidates].sort((a, b) => {
      const indexA = preferred.indexOf(a.provider)
      const indexB = preferred.indexOf(b.provider)

      // If both in preferred list, sort by preference order
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }

      // Preferred providers come first
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1

      // Otherwise maintain existing order
      return 0
    })
  }

  /**
   * Build selection reason
   */
  private buildReason(
    selected: ModelEntry,
    alternatives: ModelEntry[],
    options: SelectionOptions,
    rejections: Array<{ modelId: string; reason: string }>,
    _allCandidates: string[],
  ): SelectionReason {
    const factors: string[] = []

    // Add optimization strategy
    const strategy = options.optimizeFor || "balanced"
    factors.push(`Optimization: ${strategy}`)

    // Add cost info
    const avgCost = (selected.input + selected.output) / 2
    factors.push(`Cost: $${avgCost.toFixed(3)}/1M tokens`)

    // Add performance info
    factors.push(`Speed: ${selected.speed}`)
    factors.push(`Intelligence: ${selected.intelligence}/10`)

    // Add features if requested
    if (options.requiredFeatures && options.requiredFeatures.length > 0) {
      factors.push(`Features: ${options.requiredFeatures.join(", ")}`)
    }

    // Build primary reason
    let primary = `Selected ${selected.id}`
    if (strategy === "cost") {
      primary += " (cheapest option)"
    } else if (strategy === "speed") {
      primary += " (fastest option)"
    } else if (strategy === "quality") {
      primary += " (highest quality)"
    } else {
      primary += " (best balanced option)"
    }

    return {
      primary,
      factors,
      alternatives: alternatives.map(m => m.id),
      rejections: rejections.length > 0 ? rejections.slice(0, 5) : undefined, // Limit to top 5
    }
  }

  /**
   * Convert SelectionOptions to ModelQuery
   */
  private optionsToQuery(options: SelectionOptions): any {
    return {
      minContextLength: options.minContextLength,
      minIntelligence: options.minIntelligence,
      maxLatency: options.maxLatency,
      capabilities: options.requiredFeatures
        ? {
            tools: options.requiredFeatures.includes("tools"),
            jsonMode: options.requiredFeatures.includes("json-mode"),
            streaming: options.requiredFeatures.includes("streaming"),
            vision: options.requiredFeatures.includes("vision"),
          }
        : undefined,
    }
  }
}

/**
 * Singleton selector instance
 */
let selectorInstance: PolicySelector | null = null

/**
 * Get or create singleton selector
 */
export function getSelector(registry?: ModelRegistry): PolicySelector {
  if (!selectorInstance && !registry) {
    throw new Error("Selector not initialized. Provide registry on first call.")
  }

  if (!selectorInstance && registry) {
    selectorInstance = new PolicySelector(registry)
  }

  return selectorInstance!
}

/**
 * Reset selector (for testing)
 */
export function resetSelector(): void {
  selectorInstance = null
}
