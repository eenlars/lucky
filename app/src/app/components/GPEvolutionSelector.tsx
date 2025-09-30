"use client"

import { useEffect, useMemo, useState } from "react"
import { EvolutionRun, RunSelect } from "./RunSelect"

export function GPEvolutionSelector({
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

  const gpRuns = useMemo(
    () =>
      runs.filter(r => {
        // Prefer evolution_type if available; fallback to legacy config mode
        const t = (r as EvolutionRun & { evolution_type?: string }).evolution_type
        if (t) return t.toLowerCase() === "gp"
        const mode = r.config?.mode || r.config?.evolution?.mode
        return mode === "genetic" || mode === "GP"
      }),
    [runs],
  )

  const selectedValue = useMemo(() => {
    if (!currentRunId) return ""
    return gpRuns.some(r => r.run_id === currentRunId) ? currentRunId : ""
  }, [currentRunId, gpRuns])

  return (
    <RunSelect
      id="gp-evolution-select"
      label="GP Run:"
      runs={gpRuns}
      value={selectedValue}
      onChange={onRunSelect}
      loading={loading || loadingRuns}
      placeholder="Select a GP evolution run..."
    />
  )
}
