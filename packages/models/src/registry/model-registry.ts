/**
 * Model Registry - Fast lookup and filtering of models
 *
 * Provides efficient access to the model catalog with multiple indices:
 * - By ID (O(1))
 * - By provider (O(1))
 * - By capability (O(1))
 * - By budget/cost (sorted for range queries)
 *
 * @module registry/model-registry
 */

import type { ModelEntry } from "@lucky/shared"

/**
 * Query filters for finding models
 */
export interface ModelQuery {
  // Identity filters
  provider?: string | string[]
  modelId?: string

  // Capability filters
  capabilities?: {
    tools?: boolean
    jsonMode?: boolean
    streaming?: boolean
    vision?: boolean
  }

  // Context filters
  minContextLength?: number
  maxContextLength?: number

  // Cost filters (per 1M tokens)
  maxInputCost?: number
  maxOutputCost?: number
  maxAvgCost?: number

  // Performance filters
  speed?: "fast" | "medium" | "slow"
  minIntelligence?: number
  maxIntelligence?: number
  pricingTier?: "low" | "medium" | "high"

  // Status
  activeOnly?: boolean
}

/**
 * Registry statistics
 */
export interface RegistryStats {
  total: number
  active: number
  byProvider: Record<string, number>
  bySpeed: Record<string, number>
  byPricingTier: Record<string, number>
  avgContextLength: number
  avgInputCost: number
  avgOutputCost: number
}

/**
 * Model Registry with indexed lookups
 */
export class ModelRegistry {
  // Primary index: by ID
  private byId: Map<string, ModelEntry>

  // Secondary indices for fast filtering
  private byProvider: Map<string, Set<string>> // provider -> Set<modelId>
  private byCapability: Map<string, Set<string>> // capability -> Set<modelId>
  private bySpeed: Map<string, Set<string>> // speed -> Set<modelId>
  private byPricingTier: Map<string, Set<string>> // tier -> Set<modelId>

  // Sorted lists for range queries
  private sortedByCost: ModelEntry[] // Sorted by average cost
  private sortedByContext: ModelEntry[] // Sorted by context length
  private sortedByIntelligence: ModelEntry[] // Sorted by intelligence

  constructor(catalog: ModelEntry[]) {
    this.byId = new Map()
    this.byProvider = new Map()
    this.byCapability = new Map()
    this.bySpeed = new Map()
    this.byPricingTier = new Map()
    this.sortedByCost = []
    this.sortedByContext = []
    this.sortedByIntelligence = []

    this.buildIndices(catalog)
  }

  /**
   * Get model by ID
   */
  get(modelId: string): ModelEntry | null {
    return this.byId.get(modelId) || null
  }

  /**
   * List all models (optionally filtered)
   */
  list(query: ModelQuery = {}): ModelEntry[] {
    let candidates: Set<string> | null = null

    // Start with most restrictive filter
    if (query.modelId) {
      const model = this.get(query.modelId)
      return model && this.matchesQuery(model, query) ? [model] : []
    }

    // Filter by provider
    if (query.provider) {
      const providers = Array.isArray(query.provider) ? query.provider : [query.provider]
      candidates = new Set<string>()
      for (const provider of providers) {
        const providerModels = this.byProvider.get(provider)
        if (providerModels) {
          providerModels.forEach(id => candidates!.add(id))
        }
      }
      if (candidates.size === 0) return []
    }

    // Filter by capabilities
    if (query.capabilities) {
      const capSets: Set<string>[] = []

      if (query.capabilities.tools) {
        const toolsSet = this.byCapability.get("tools")
        if (!toolsSet) return [] // Required capability missing
        capSets.push(toolsSet)
      }
      if (query.capabilities.jsonMode) {
        const jsonSet = this.byCapability.get("jsonMode")
        if (!jsonSet) return [] // Required capability missing
        capSets.push(jsonSet)
      }
      if (query.capabilities.streaming) {
        const streamSet = this.byCapability.get("streaming")
        if (!streamSet) return [] // Required capability missing
        capSets.push(streamSet)
      }
      if (query.capabilities.vision) {
        const visionSet = this.byCapability.get("vision")
        if (!visionSet) return [] // Required capability missing
        capSets.push(visionSet)
      }

      // Intersect all capability sets
      if (capSets.length > 0) {
        const intersection = this.intersectSets(capSets)
        candidates = candidates ? this.intersectSets([candidates, intersection]) : intersection
        if (candidates.size === 0) return []
      }
    }

    // Filter by speed
    if (query.speed) {
      const speedSet = this.bySpeed.get(query.speed)
      if (!speedSet) return [] // Required speed missing
      candidates = candidates ? this.intersectSets([candidates, speedSet]) : speedSet
      if (candidates.size === 0) return []
    }

    // Filter by pricing tier
    if (query.pricingTier) {
      const tierSet = this.byPricingTier.get(query.pricingTier)
      if (!tierSet) return [] // Required tier missing
      candidates = candidates ? this.intersectSets([candidates, tierSet]) : tierSet
      if (candidates.size === 0) return []
    }

    // Get model entries from candidates or all models
    const models = candidates
      ? Array.from(candidates)
          .map(id => this.byId.get(id)!)
          .filter(Boolean)
      : Array.from(this.byId.values())

    // Apply remaining filters
    return models.filter(model => this.matchesQuery(model, query))
  }

  /**
   * Find models by capability requirements
   */
  findByCapabilities(required: string[]): ModelEntry[] {
    if (required.length === 0) {
      return Array.from(this.byId.values()).filter(m => m.active)
    }

    const sets = required.map(cap => this.byCapability.get(cap)).filter(Boolean) as Set<string>[]

    // If any required capability is missing, no models can satisfy the request
    if (sets.length !== required.length) return []

    if (sets.length === 0) return []

    const intersection = this.intersectSets(sets)
    return Array.from(intersection)
      .map(id => this.byId.get(id)!)
      .filter(m => m.active)
  }

  /**
   * Find models within budget
   */
  findInBudget(maxAvgCost: number, activeOnly = true): ModelEntry[] {
    // Use sorted list for efficient range query
    const result: ModelEntry[] = []

    for (const model of this.sortedByCost) {
      if (activeOnly && !model.active) continue

      const avgCost = (model.input + model.output) / 2
      if (avgCost <= maxAvgCost) {
        result.push(model)
      } else {
        // Since sorted, we can stop early
        break
      }
    }

    return result
  }

  /**
   * Find models with minimum context length
   */
  findByMinContext(minLength: number, activeOnly = true): ModelEntry[] {
    const result: ModelEntry[] = []

    // Use sorted list - find insertion point
    for (const model of this.sortedByContext) {
      if (activeOnly && !model.active) continue
      if (model.contextLength >= minLength) {
        result.push(model)
      }
    }

    return result
  }

  /**
   * Find models by minimum intelligence
   */
  findByMinIntelligence(minIntel: number, activeOnly = true): ModelEntry[] {
    const result: ModelEntry[] = []

    for (const model of this.sortedByIntelligence) {
      if (activeOnly && !model.active) continue
      if (model.intelligence >= minIntel) {
        result.push(model)
      }
    }

    return result
  }

  /**
   * Get cheapest model matching criteria
   */
  getCheapest(query: ModelQuery = {}): ModelEntry | null {
    const candidates = this.list(query)
    if (candidates.length === 0) return null

    return candidates.reduce((cheapest, model) => {
      const cheapestAvg = (cheapest.input + cheapest.output) / 2
      const modelAvg = (model.input + model.output) / 2
      return modelAvg < cheapestAvg ? model : cheapest
    })
  }

  /**
   * Get fastest model matching criteria
   */
  getFastest(query: ModelQuery = {}): ModelEntry | null {
    const speedOrder = { fast: 3, medium: 2, slow: 1 }
    const candidates = this.list(query)
    if (candidates.length === 0) return null

    return candidates.reduce((fastest, model) => {
      return speedOrder[model.speed] > speedOrder[fastest.speed] ? model : fastest
    })
  }

  /**
   * Get most intelligent model matching criteria
   */
  getMostIntelligent(query: ModelQuery = {}): ModelEntry | null {
    const candidates = this.list(query)
    if (candidates.length === 0) return null

    return candidates.reduce((smartest, model) => {
      return model.intelligence > smartest.intelligence ? model : smartest
    })
  }

  /**
   * Refresh registry with new catalog
   */
  refresh(catalog: ModelEntry[]): void {
    // Clear all indices
    this.byId.clear()
    this.byProvider.clear()
    this.byCapability.clear()
    this.bySpeed.clear()
    this.byPricingTier.clear()

    // Rebuild
    this.buildIndices(catalog)
  }

  /**
   * Get registry statistics
   */
  getStats(): RegistryStats {
    const models = Array.from(this.byId.values())
    const active = models.filter(m => m.active)

    const byProvider: Record<string, number> = {}
    const bySpeed: Record<string, number> = {}
    const byPricingTier: Record<string, number> = {}

    for (const model of active) {
      byProvider[model.provider] = (byProvider[model.provider] || 0) + 1
      bySpeed[model.speed] = (bySpeed[model.speed] || 0) + 1
      byPricingTier[model.pricingTier] = (byPricingTier[model.pricingTier] || 0) + 1
    }

    const totalContext = active.reduce((sum, m) => sum + m.contextLength, 0)
    const totalInputCost = active.reduce((sum, m) => sum + m.input, 0)
    const totalOutputCost = active.reduce((sum, m) => sum + m.output, 0)

    // Guard against division by zero when no active models
    const activeCount = active.length || 1

    return {
      total: models.length,
      active: active.length,
      byProvider,
      bySpeed,
      byPricingTier,
      avgContextLength: active.length > 0 ? Math.round(totalContext / activeCount) : 0,
      avgInputCost: active.length > 0 ? Number((totalInputCost / activeCount).toFixed(3)) : 0,
      avgOutputCost: active.length > 0 ? Number((totalOutputCost / activeCount).toFixed(3)) : 0,
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Build all indices from catalog
   */
  private buildIndices(catalog: ModelEntry[]): void {
    for (const model of catalog) {
      // Primary index
      this.byId.set(model.id, model)

      // Provider index
      if (!this.byProvider.has(model.provider)) {
        this.byProvider.set(model.provider, new Set())
      }
      this.byProvider.get(model.provider)!.add(model.id)

      // Capability indices
      if (model.supportsTools) {
        this.addToIndex(this.byCapability, "tools", model.id)
      }
      if (model.supportsJsonMode) {
        this.addToIndex(this.byCapability, "jsonMode", model.id)
      }
      if (model.supportsStreaming) {
        this.addToIndex(this.byCapability, "streaming", model.id)
      }
      if (model.supportsVision) {
        this.addToIndex(this.byCapability, "vision", model.id)
      }

      // Speed index
      this.addToIndex(this.bySpeed, model.speed, model.id)

      // Pricing tier index
      this.addToIndex(this.byPricingTier, model.pricingTier, model.id)
    }

    // Build sorted lists
    this.sortedByCost = [...catalog].sort((a, b) => {
      const avgA = (a.input + a.output) / 2
      const avgB = (b.input + b.output) / 2
      return avgA - avgB
    })

    this.sortedByContext = [...catalog].sort((a, b) => a.contextLength - b.contextLength)

    this.sortedByIntelligence = [...catalog].sort((a, b) => b.intelligence - a.intelligence)
  }

  /**
   * Add entry to index
   */
  private addToIndex(index: Map<string, Set<string>>, key: string, modelId: string): void {
    if (!index.has(key)) {
      index.set(key, new Set())
    }
    index.get(key)!.add(modelId)
  }

  /**
   * Intersect multiple sets
   */
  private intersectSets(sets: Set<string>[]): Set<string> {
    if (sets.length === 0) return new Set()
    if (sets.length === 1) return sets[0]

    const [first, ...rest] = sets
    const result = new Set<string>()

    for (const item of first) {
      if (rest.every(set => set.has(item))) {
        result.add(item)
      }
    }

    return result
  }

  /**
   * Check if model matches query filters
   */
  private matchesQuery(model: ModelEntry, query: ModelQuery): boolean {
    // Active filter
    if (query.activeOnly !== false && !model.active) {
      return false
    }

    // Context length filters
    if (query.minContextLength && model.contextLength < query.minContextLength) {
      return false
    }
    if (query.maxContextLength && model.contextLength > query.maxContextLength) {
      return false
    }

    // Cost filters
    if (query.maxInputCost && model.input > query.maxInputCost) {
      return false
    }
    if (query.maxOutputCost && model.output > query.maxOutputCost) {
      return false
    }
    if (query.maxAvgCost) {
      const avgCost = (model.input + model.output) / 2
      if (avgCost > query.maxAvgCost) {
        return false
      }
    }

    // Intelligence filters
    if (query.minIntelligence && model.intelligence < query.minIntelligence) {
      return false
    }
    if (query.maxIntelligence && model.intelligence > query.maxIntelligence) {
      return false
    }

    return true
  }
}

/**
 * Singleton registry instance
 */
let registryInstance: ModelRegistry | null = null

/**
 * Get or create singleton registry
 */
export function getRegistry(catalog?: ModelEntry[]): ModelRegistry {
  if (!registryInstance && !catalog) {
    throw new Error("Registry not initialized. Provide catalog on first call.")
  }

  if (!registryInstance && catalog) {
    registryInstance = new ModelRegistry(catalog)
  } else if (registryInstance && catalog) {
    registryInstance.refresh(catalog)
  }

  return registryInstance!
}

/**
 * Reset registry (for testing)
 */
export function resetRegistry(): void {
  registryInstance = null
}
