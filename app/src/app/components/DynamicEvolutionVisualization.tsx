"use client"

import React, { useState } from "react"
import { EvolutionSelector } from "./EvolutionSelector"
import { EvolutionGraph } from "./EvolutionGraph"

export function DynamicEvolutionVisualization() {
  const [selectedRunId, setSelectedRunId] = useState<string>("evo_run_b1c971") // Default to the one we know
  const [loading, _setLoading] = useState(false)

  const handleRunSelect = (runId: string) => {
    if (runId && runId !== selectedRunId) {
      setSelectedRunId(runId)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with selector */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Evolution Dashboard</h1>
              <p className="text-gray-600">Explore different workflow evolution runs</p>
            </div>
            <EvolutionSelector currentRunId={selectedRunId} onRunSelect={handleRunSelect} loading={loading} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <EvolutionGraph runId={selectedRunId} className="px-6 py-4" />
    </div>
  )
}
