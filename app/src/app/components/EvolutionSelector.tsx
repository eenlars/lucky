"use client"

import { CulturalEvolutionSelector } from "./CulturalEvolutionSelector"
import { GPEvolutionSelector } from "./GPEvolutionSelector"

interface EvolutionSelectorProps {
  currentRunId?: string
  onRunSelect: (runId: string) => void
  loading?: boolean
}

export function EvolutionSelector({
  currentRunId,
  onRunSelect,
  loading = false,
}: EvolutionSelectorProps) {
  return (
    <div className="flex items-center gap-6">
      <CulturalEvolutionSelector
        currentRunId={currentRunId}
        onRunSelect={onRunSelect}
        loading={loading}
      />
      <GPEvolutionSelector
        currentRunId={currentRunId}
        onRunSelect={onRunSelect}
        loading={loading}
      />
    </div>
  )
}
