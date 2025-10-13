"use client"

import { logException } from "@/lib/error-logger"
import React, { useState, useEffect } from "react"
import { FailedRunVisualization } from "./FailedRunVisualization"
import { WorkflowEvolutionVisualization } from "./WorkflowEvolutionVisualization"

interface EvolutionData {
  graph: any
  visualization: any
  runId: string
  runInfo?: {
    goal_text: string
    status: string
    start_time: string
    end_time?: string
    total_invocations?: number
    successful_invocations?: number
  }
}

interface EvolutionGraphProps {
  runId: string
  className?: string
}

export function EvolutionGraph({ runId, className = "" }: EvolutionGraphProps) {
  const [evolutionData, setEvolutionData] = useState<EvolutionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (runId) {
      loadEvolutionByRunId(runId)
    }
  }, [runId])

  const loadEvolutionByRunId = async (runId: string) => {
    try {
      setLoading(true)
      setError(null)

      // Use the API to trace any evolution run
      const response = await fetch(`/api/evolution/${runId}/trace`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // If it's a "no successful invocations" error, try to get basic run info
        if (
          errorData.error?.includes("No successful invocations") ||
          errorData.error?.includes("No invocations found")
        ) {
          try {
            const runInfoResponse = await fetch("/api/evolution-runs")
            if (runInfoResponse.ok) {
              const allRuns = await runInfoResponse.json()
              const currentRun = allRuns.find((run: any) => run.run_id === runId)
              if (currentRun) {
                setEvolutionData({
                  graph: null,
                  visualization: null,
                  runId: runId,
                  runInfo: {
                    goal_text: currentRun.goal_text,
                    status: currentRun.status,
                    start_time: currentRun.start_time,
                    end_time: currentRun.end_time,
                    total_invocations: currentRun.total_invocations || 0,
                    successful_invocations: currentRun.successful_invocations || 0,
                  },
                })
                setLoading(false)
                return
              }
            }
          } catch (_e) {
            console.log("Could not fetch run info for failed run")
          }
        }

        throw new Error(errorData.error || `Failed to load evolution run: ${response.statusText}`)
      }

      const data = await response.json()
      setEvolutionData({
        graph: data.graph,
        visualization: data.visualization,
        runId: runId,
      })
    } catch (err) {
      logException(err, {
        location: window.location.pathname,
      })
      console.error("Failed to load evolution data:", err)
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  if (loading && !evolutionData) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="text-gray-600">Loading evolution graph...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-red-400">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error Loading Evolution Graph</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!evolutionData) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <p className="text-gray-500">No evolution data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {evolutionData.graph && evolutionData.visualization ? (
        <WorkflowEvolutionVisualization graph={evolutionData.graph} visualization={evolutionData.visualization} />
      ) : evolutionData.runInfo ? (
        <FailedRunVisualization
          runId={evolutionData.runId}
          totalInvocations={evolutionData.runInfo.total_invocations || 0}
          successfulInvocations={evolutionData.runInfo.successful_invocations || 0}
          evolutionGoal={evolutionData.runInfo.goal_text}
          runStatus={evolutionData.runInfo.status}
          startTime={evolutionData.runInfo.start_time}
          endTime={evolutionData.runInfo.end_time}
        />
      ) : null}
    </div>
  )
}
