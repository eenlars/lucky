"use client"

import { Input } from "@/react-flow-visualization/components/ui/input"
import { useEffect, useState } from "react"
import type { FilterPreset, ModelFiltersProps } from "./types"

export function ModelFilters({ searchQuery, onSearchChange, activePreset, onPresetChange }: ModelFiltersProps) {
  const [searchInput, setSearchInput] = useState(searchQuery)

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearchChange(searchInput)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, onSearchChange])

  const presets: Array<{ value: FilterPreset; label: string }> = [
    { value: "all", label: "All" },
    { value: "recommended", label: "Recommended" },
    { value: "fast", label: "Fast" },
    { value: "high-quality", label: "High Quality" },
    { value: "with-vision", label: "Vision" },
    { value: "with-tools", label: "Tools" },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-6">
      {/* Search bar */}
      <Input
        placeholder="Search"
        value={searchInput}
        onChange={e => setSearchInput(e.target.value)}
        className="flex-1 h-9 text-[13px] border-border/40"
      />

      {/* Preset filters */}
      <div className="flex gap-4 text-[13px]">
        {presets.map(preset => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onPresetChange(preset.value)}
            className={
              activePreset === preset.value
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground transition-colors"
            }
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}
