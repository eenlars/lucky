"use client"

import React, { useState, useEffect } from "react"

interface EvolutionRun {
  run_id: string
  goal_text: string
  status: string
  start_time: string
  end_time: string | null
  config: any
  total_invocations?: number
  successful_invocations?: number
  generation_count?: number
}

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
  const [availableRuns, setAvailableRuns] = useState<EvolutionRun[]>([])
  const [loadingRuns, setLoadingRuns] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAvailableRuns()
  }, [])

  const fetchAvailableRuns = async () => {
    try {
      setLoadingRuns(true)

      const response = await fetch("/api/evolution-runs")
      if (!response.ok) {
        throw new Error(
          `Failed to fetch evolution runs: ${response.statusText}`
        )
      }

      const runs = await response.json()
      setAvailableRuns(runs)
    } catch (err) {
      console.error("Error fetching evolution runs:", err)
      setError(
        err instanceof Error ? err.message : "Failed to load evolution runs"
      )

      // Fallback to known data if API fails
      const fallbackRuns: EvolutionRun[] = [
        {
          run_id: "evo_run_b1c971",
          goal_text:
            "Find physical stores of B-corporations in the Netherlands",
          status: "interrupted",
          start_time: "2025-07-17T02:00:28.17+00:00",
          end_time: "2025-07-17T08:01:46.702+00:00",
          config: { mode: "cultural" },
        },
      ]
      setAvailableRuns(fallbackRuns)
    } finally {
      setLoadingRuns(false)
    }
  }

  const formatRunTitle = (run: EvolutionRun) => {
    const date = new Date(run.start_time).toLocaleDateString()
    const goalPreview =
      run.goal_text.slice(0, 40) + (run.goal_text.length > 40 ? "..." : "")
    const mode = run.config?.mode || "unknown"
    const successRate =
      run.total_invocations && run.total_invocations > 0
        ? `${Math.round(((run.successful_invocations || 0) / run.total_invocations) * 100)}%`
        : "0%"
    const genInfo = run.generation_count
      ? `${run.generation_count} generations`
      : "0 generations"
    const invocationInfo = `${run.total_invocations || 0} invocations`
    const statusIcon =
      run.successful_invocations && run.successful_invocations > 0 ? "✅" : "⚠️"

    return `${statusIcon} ${date} - ${mode} - ${genInfo}, ${invocationInfo} (${successRate}) - ${goalPreview}`
  }

  if (loadingRuns) {
    return (
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span className="text-sm text-gray-600">Loading evolution runs...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-red-600 text-sm">Error loading runs: {error}</div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <label
        htmlFor="evolution-select"
        className="text-sm font-medium text-gray-700"
      >
        Evolution Run:
      </label>
      <select
        id="evolution-select"
        value={currentRunId || ""}
        onChange={(e) => onRunSelect(e.target.value)}
        disabled={loading}
        className="block min-w-[600px] max-w-[800px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50 truncate"
      >
        {availableRuns.length === 0 ? (
          <option value="">No evolution runs with data available</option>
        ) : (
          <>
            <option value="">Select an evolution run...</option>
            {availableRuns.map((run) => (
              <option key={run.run_id} value={run.run_id}>
                {formatRunTitle(run)}
              </option>
            ))}
          </>
        )}
      </select>
      {loading && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
      )}
    </div>
  )
}
