import type {
  FilterPreset,
  GroupBy,
  ModelCapability,
  ModelFilters,
  ModelSpeed,
  SortBy,
} from "@/components/providers/model-selection/types"
import type { EnrichedModelInfo } from "@lucky/shared"

/**
 * Filter models based on search query, capabilities, speed, and intelligence range
 */
export function filterModels(models: EnrichedModelInfo[], filters: ModelFilters): EnrichedModelInfo[] {
  return models.filter(model => {
    // Search filter
    if (filters.search && !model.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }

    // Capability filters
    if (filters.capabilities.size > 0) {
      const hasAllCapabilities = Array.from(filters.capabilities).every(cap => {
        switch (cap) {
          case "tools":
            return model.supportsTools
          case "vision":
            return model.supportsVision
          case "reasoning":
            return model.supportsReasoning
          case "audio":
            return model.supportsAudio
          case "video":
            return model.supportsVideo
          default:
            return false
        }
      })
      if (!hasAllCapabilities) return false
    }

    // Speed filter
    if (filters.speeds.size > 0 && !filters.speeds.has(model.speed as ModelSpeed)) {
      return false
    }

    // Intelligence range filter
    const [minIntelligence, maxIntelligence] = filters.intelligenceRange
    if (model.intelligence < minIntelligence || model.intelligence > maxIntelligence) {
      return false
    }

    return true
  })
}

/**
 * Sort models based on the selected sort option
 */
export function sortModels(
  models: EnrichedModelInfo[],
  sortBy: SortBy,
  allModels?: EnrichedModelInfo[],
): EnrichedModelInfo[] {
  const sorted = [...models]

  switch (sortBy) {
    case "recommended": {
      // Sort by recommendation score (same algorithm as getRecommendedModels)
      const recommendedNames = allModels ? getRecommendedModels(allModels) : getRecommendedModels(models)
      return sorted.sort((a, b) => {
        const aIndex = recommendedNames.indexOf(a.name)
        const bIndex = recommendedNames.indexOf(b.name)
        const aRank = aIndex === -1 ? Number.POSITIVE_INFINITY : aIndex
        const bRank = bIndex === -1 ? Number.POSITIVE_INFINITY : bIndex
        return aRank - bRank
      })
    }
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case "cost":
      return sorted.sort((a, b) => a.inputCostPer1M - b.inputCostPer1M)
    case "intelligence":
      return sorted.sort((a, b) => b.intelligence - a.intelligence)
    case "contextLength":
      return sorted.sort((a, b) => b.contextLength - a.contextLength)
    default:
      return sorted
  }
}

/**
 * Sort models with enabled models first, then by the specified sort criteria
 */
export function sortModelsWithEnabledFirst(
  models: EnrichedModelInfo[],
  enabledModels: Set<string>,
  sortBy: SortBy,
  allModels?: EnrichedModelInfo[],
): EnrichedModelInfo[] {
  const sorted = sortModels(models, sortBy, allModels)

  return sorted.sort((a, b) => {
    const aEnabled = enabledModels.has(a.id)
    const bEnabled = enabledModels.has(b.id)
    if (aEnabled && !bEnabled) return -1
    if (!aEnabled && bEnabled) return 1
    return 0
  })
}

/**
 * Group models based on the selected grouping option
 */
export function groupModels(models: EnrichedModelInfo[], groupBy: GroupBy): Map<string, EnrichedModelInfo[]> {
  const groups = new Map<string, EnrichedModelInfo[]>()

  if (groupBy === "none") {
    groups.set("all", models)
    return groups
  }

  for (const model of models) {
    let groupKey: string

    switch (groupBy) {
      case "speed":
        groupKey = model.speed
        break
      case "intelligence":
        if (model.intelligence >= 8) groupKey = "High (8-10)"
        else if (model.intelligence >= 5) groupKey = "Medium (5-7)"
        else groupKey = "Low (0-4)"
        break
      case "capabilities": {
        const caps: string[] = []
        if (model.supportsTools) caps.push("tools")
        if (model.supportsVision) caps.push("vision")
        if (model.supportsReasoning) caps.push("reasoning")
        if (model.supportsAudio) caps.push("audio")
        if (model.supportsVideo) caps.push("video")
        groupKey = caps.length > 0 ? caps.join(", ") : "basic"
        break
      }
      default:
        groupKey = "all"
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, [])
    }
    groups.get(groupKey)?.push(model)
  }

  return groups
}

/**
 * Get models that match the "fast" criteria
 */
export function getFastModels(models: EnrichedModelInfo[]): string[] {
  return models.filter(m => m.speed === "fast").map(m => m.name)
}

/**
 * Get models that match the "high intelligence" criteria (8+)
 */
export function getHighIntelligenceModels(models: EnrichedModelInfo[]): string[] {
  return models.filter(m => m.intelligence >= 8).map(m => m.name)
}

/**
 * Get recommended models based on quality, speed, and capabilities
 * Returns top 5 models that balance intelligence, speed, and cost
 */
export function getRecommendedModels(models: EnrichedModelInfo[]): string[] {
  // Score models based on multiple factors
  const scored = models.map(model => {
    let score = 0

    // Intelligence is most important (0-10 points)
    score += model.intelligence

    // Speed bonus (fast=5, medium=3, slow=0)
    if (model.speed === "fast") score += 5
    else if (model.speed === "medium") score += 3

    // Tool support is critical (+3 points)
    if (model.supportsTools) score += 3

    // Cost efficiency (lower cost = better, normalize to 0-3 points)
    const avgCost = (model.inputCostPer1M + model.outputCostPer1M) / 2
    if (avgCost < 1) score += 3
    else if (avgCost < 5) score += 2
    else if (avgCost < 10) score += 1

    return { model, score }
  })

  // Sort by score descending and take top 5
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.model.name)
}

/**
 * Check if a model is recommended
 */
export function isModelRecommended(modelName: string, models: EnrichedModelInfo[]): boolean {
  return getRecommendedModels(models).includes(modelName)
}

/**
 * Apply a preset to create a filter configuration
 */
export function applyPreset(preset: FilterPreset): ModelFilters {
  const baseFilters: ModelFilters = {
    search: "",
    capabilities: new Set(),
    speeds: new Set(),
    intelligenceRange: [0, 10],
  }

  switch (preset) {
    case "all":
      return baseFilters
    case "recommended":
      // Show all models, but we'll filter by recommended list in the grid
      return baseFilters
    case "fast":
      return { ...baseFilters, speeds: new Set(["fast"]) }
    case "high-quality":
      return { ...baseFilters, intelligenceRange: [8, 10] }
    case "with-vision":
      return { ...baseFilters, capabilities: new Set(["vision"]) }
    case "with-tools":
      return { ...baseFilters, capabilities: new Set(["tools"]) }
    default:
      return baseFilters
  }
}
