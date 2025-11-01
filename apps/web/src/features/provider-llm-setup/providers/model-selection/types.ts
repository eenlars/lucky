import type { EnrichedModelInfo, ModelSpeed } from "@lucky/shared"

export type ModelCapability = "tools" | "vision" | "reasoning" | "audio" | "video"
export type GroupBy = "none" | "speed" | "intelligence" | "capabilities"
export type SortBy = "recommended" | "name" | "cost" | "intelligence" | "contextLength"
export type FilterPreset = "all" | "recommended" | "fast" | "high-quality" | "with-vision" | "with-tools"

export type { ModelSpeed }

export interface ModelFilters {
  search: string
  capabilities: Set<ModelCapability>
  speeds: Set<ModelSpeed>
  intelligenceRange: [number, number]
}

export interface ModelCardProps {
  model: EnrichedModelInfo
  isEnabled: boolean
  onToggle: () => void
  isRecommended?: boolean
}

export interface ModelFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  activePreset: FilterPreset
  onPresetChange: (preset: FilterPreset) => void
}

export interface ModelGridProps {
  models: EnrichedModelInfo[]
  enabledModels: Set<string>
  onToggleModel: (gatewayModelId: string) => void
  onBulkToggleModels: (gatewayModelIds: string[], enable: boolean) => void
  isLoading?: boolean
}

export interface ModelBulkActionsProps {
  totalModels: number
  enabledModels: number
  filteredModels: number
  onEnableRecommended: () => void
  onEnableAll: () => void
  onDisableAll: () => void
}
