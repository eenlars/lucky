"use client"

import { useEffect, useMemo, useState } from "react"
import { EvolutionRun, RunSelect } from "./RunSelect"

export function CulturalEvolutionSelector({
  currentRunId,
  onRunSelect,
  loading = false,
}: {
  currentRunId?: string
  onRunSelect: (runId: string) => void
  loading?: boolean
}) {
  const [runs, setRuns] = useState<EvolutionRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchRuns() {
      setLoadingRuns(true)
      try {
        const response = await fetch("/api/evolution-runs")
        if (!response.ok) throw new Error("Failed to fetch evolution runs")
        const allRuns: EvolutionRun[] = await response.json()
        if (!cancelled) {
          setRuns(allRuns)
        }
      } catch (e) {
        console.error("Error fetching evolution runs:", e)
        if (!cancelled) setRuns([])
      } finally {
        if (!cancelled) setLoadingRuns(false)
      }
    }
    fetchRuns()
    return () => {
      cancelled = true
    }
  }, [])

  const culturalRuns = useMemo(
    () =>
      runs.filter(r => {
        const t = (r as EvolutionRun & { evolution_type?: string }).evolution_type
        if (t) return t.toLowerCase() === "iterative"
        const mode = r.config?.mode || r.config?.evolution?.mode
        return mode === "cultural" || mode === "iterative"
      }),
    [runs],
  )

  const selectedValue = useMemo(() => {
    if (!currentRunId) return ""
    return culturalRuns.some(r => r.run_id === currentRunId) ? currentRunId : ""
  }, [currentRunId, culturalRuns])

  return (
    <RunSelect
      id="cultural-evolution-select"
      label="Cultural Run:"
      runs={culturalRuns}
      value={selectedValue}
      onChange={onRunSelect}
      loading={loading || loadingRuns}
      placeholder="Select a cultural evolution run..."
    />
  )
}
