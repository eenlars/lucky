"use client"

import {
  applyPreset,
  filterModels,
  getRecommendedModels,
  isModelRecommended,
  sortModels,
  sortModelsWithEnabledFirst,
} from "@/features/provider-llm-setup/model-filters"
import { AlertCircle, Loader2 } from "lucide-react"
import { useMemo, useState } from "react"
import { ModelBulkActions } from "./ModelBulkActions"
import { ModelCard } from "./ModelCard"
import { ModelFilters } from "./ModelFilters"
import type { FilterPreset, ModelGridProps } from "./types"

export function ModelGrid({ models, enabledModels, onToggleModel, onBulkToggleModels, isLoading }: ModelGridProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activePreset, setActivePreset] = useState<FilterPreset>("all")
  const [hasUserInteracted, setHasUserInteracted] = useState(false)

  // Track user interaction on actual toggle events
  const handleToggleModel = (modelId: string) => {
    setHasUserInteracted(true)
    onToggleModel(modelId)
  }

  const handleBulkToggle = (modelIds: string[], enabled: boolean) => {
    setHasUserInteracted(true)
    onBulkToggleModels(modelIds, enabled)
  }

  // Get recommended model names
  const recommendedModelNames = useMemo(() => getRecommendedModels(models), [models])

  // Apply preset filters
  const presetFilters = useMemo(() => applyPreset(activePreset), [activePreset])

  // Apply search to filters
  const filters = useMemo(
    () => ({
      ...presetFilters,
      search: searchQuery,
    }),
    [presetFilters, searchQuery],
  )

  // Apply filters and sorting
  const filteredAndSortedModels = useMemo(() => {
    let filtered = filterModels(models, filters)

    // Special handling for "recommended" preset - only show recommended models
    if (activePreset === "recommended") {
      filtered = filtered.filter(m => recommendedModelNames.includes(m.name))
    }

    // Sort enabled models to top only on initial load, not after user interaction
    if (!hasUserInteracted) {
      return sortModelsWithEnabledFirst(filtered, enabledModels, "recommended", models)
    }

    // After user interaction, maintain stable sort order (don't move enabled to top)
    return sortModels(filtered, "recommended", models)
  }, [models, filters, activePreset, recommendedModelNames, enabledModels, hasUserInteracted])

  // Bulk actions
  const handleEnableRecommended = () => {
    // Map model names to full IDs for models that are recommended but not enabled
    const recommendedModelIds = models
      .filter(m => recommendedModelNames.includes(m.name) && !enabledModels.has(m.id))
      .map(m => m.id)
    if (recommendedModelIds.length > 0) {
      handleBulkToggle(recommendedModelIds, true)
    }
  }

  const handleEnableAll = () => {
    const modelsToEnable = filteredAndSortedModels.filter(m => !enabledModels.has(m.id)).map(m => m.id)
    if (modelsToEnable.length > 0) {
      handleBulkToggle(modelsToEnable, true)
    }
  }

  const handleDisableAll = () => {
    const modelsToDisable = filteredAndSortedModels.filter(m => enabledModels.has(m.id)).map(m => m.id)
    if (modelsToDisable.length > 0) {
      handleBulkToggle(modelsToDisable, false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Loader2 className="size-8 animate-spin mx-auto mb-2" />
        <p className="text-sm">Loading available models...</p>
      </div>
    )
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <AlertCircle className="size-8 mx-auto mb-2" />
        <p className="text-sm">Test your connection first to load available models</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ModelFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activePreset={activePreset}
        onPresetChange={setActivePreset}
      />

      {/* Bulk actions */}
      <ModelBulkActions
        totalModels={models.length}
        enabledModels={enabledModels.size}
        filteredModels={filteredAndSortedModels.length}
        onEnableRecommended={handleEnableRecommended}
        onEnableAll={handleEnableAll}
        onDisableAll={handleDisableAll}
      />

      {/* Model list */}
      {filteredAndSortedModels.length === 0 ? (
        <div className="text-center py-16 text-[13px] text-muted-foreground">
          <p>No models match your filters</p>
          <button
            type="button"
            onClick={() => {
              setActivePreset("all")
              setSearchQuery("")
            }}
            className="text-foreground hover:text-foreground/80 transition-colors mt-4"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="border border-border/40 rounded-sm overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-8 py-3 px-6 bg-muted/20 border-b border-border/40 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
            <div className="flex-1">Model</div>
            <div className="w-32">Capabilities</div>
            <div className="w-8 text-right">IQ</div>
            <div className="w-12 text-right">Context</div>
            <div className="w-32 text-right">Cost (in/out)</div>
            <div className="w-10 text-right">Enabled</div>
          </div>

          {/* Model rows */}
          {filteredAndSortedModels.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              isEnabled={enabledModels.has(model.id)}
              onToggle={() => handleToggleModel(model.id)}
              isRecommended={isModelRecommended(model.name, models)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
