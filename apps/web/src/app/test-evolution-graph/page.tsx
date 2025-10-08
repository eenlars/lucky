"use client"

import { DevOnly } from "@/components/DevOnly"
import { EvolutionGraph } from "../components/EvolutionGraph"

export default function TestEvolutionGraphPage() {
  return (
    <DevOnly>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Testing Evolution Graph Component</h1>
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold mb-2">Test 1: evo_run_66fcac</h2>
            <EvolutionGraph runId="evo_run_66fcac" />
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">Test 2: Invalid Run ID</h2>
            <EvolutionGraph runId="invalid_run_id" />
          </div>
        </div>
      </div>
    </DevOnly>
  )
}
