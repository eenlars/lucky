"use client"

import React, { useEffect, useState } from "react"
import { WorkflowEvolutionVisualization } from "../app/components/WorkflowEvolutionVisualization"
import { traceWorkflowEvolution } from "./workflow-evolution-tracer"
import { createEvolutionVisualizationData } from "../lib/evolution-utils"

export default function EvolutionVisualizationPage() {
  const [evolutionData, setEvolutionData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadEvolutionData() {
      try {
        setLoading(true)

        // try to load from the saved JSON file first
        try {
          const response = await fetch("/results/evolution-graph-b463376e.json")
          if (response.ok) {
            const savedData = await response.json()
            setEvolutionData(savedData)
            setLoading(false)
            return
          }
        } catch (e) {
          console.log("No saved data found, generating fresh data...")
        }

        // generate fresh data
        const graph = await traceWorkflowEvolution("b463376e")
        if (!graph) {
          throw new Error("Failed to trace workflow evolution")
        }

        const visualization = createEvolutionVisualizationData(graph)

        setEvolutionData({ graph, visualization })
        setLoading(false)
      } catch (err) {
        console.error("Failed to load evolution data:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
        setLoading(false)
      }
    }

    loadEvolutionData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading evolution data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-red-500 text-xl">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900">
            Failed to Load Data
          </h2>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!evolutionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No evolution data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <WorkflowEvolutionVisualization
        graph={evolutionData.graph}
        visualization={evolutionData.visualization}
      />
    </div>
  )
}
