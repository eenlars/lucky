"use client"

import React, { useMemo } from "react"
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Scatter,
  ReferenceLine,
  ComposedChart,
} from "recharts"

interface InvocationData {
  invocationId: string
  accuracy?: number
  startTime: string
}

interface GenerationData {
  generation: number
  invocations: InvocationData[]
  averageAccuracy: number
}

interface ChartDataPoint {
  generation: number
  accuracy?: number
  averageAccuracy?: number
  invocationId?: string
  timestamp?: string
  isTarget?: boolean
  type: "invocation" | "average"
}

interface EvolutionVisualizationProps {
  graph: any
  visualization: {
    summary: any
    timeline: any[]
    milestones: any[]
    invocationsByGeneration?: GenerationData[]
    nodes?: any[]
  }
  runInfo?: {
    run_id: string
    goal_text: string
    status: string
    start_time: string
    end_time?: string
    total_invocations?: number
    successful_invocations?: number
    notes?: string
  }
}

function prepareChartData(
  invocationsByGeneration: GenerationData[] | undefined,
  targetNodeId: string
): ChartDataPoint[] {
  if (!invocationsByGeneration || invocationsByGeneration.length === 0)
    return []

  const allData: ChartDataPoint[] = []

  // Check if all invocations are in the same generation (common for cultural evolution)
  const uniqueGenerations = new Set(
    invocationsByGeneration.map((g) => g.generation)
  )
  const isSingleGeneration = uniqueGenerations.size === 1

  if (isSingleGeneration && invocationsByGeneration[0]) {
    // For single generation, spread invocations across x-axis by order
    const singleGenData = invocationsByGeneration[0]
    const invocationsWithAccuracy = singleGenData.invocations.filter(
      (inv) => inv.accuracy !== undefined
    )

    invocationsWithAccuracy.forEach((inv, index) => {
      allData.push({
        generation: index, // Use index as x-coordinate for better visualization
        accuracy: inv.accuracy!,
        invocationId: inv.invocationId,
        timestamp: inv.startTime,
        isTarget: inv.invocationId === targetNodeId,
        type: "invocation",
      })
    })

    // Add average line as horizontal line across all invocations
    // Need at least 2 points to draw a line
    if (invocationsWithAccuracy.length > 0) {
      allData.push({
        generation: 0,
        averageAccuracy: singleGenData.averageAccuracy,
        type: "average",
      })
      allData.push({
        generation: invocationsWithAccuracy.length - 1,
        averageAccuracy: singleGenData.averageAccuracy,
        type: "average",
      })
    }
  } else {
    // Multiple generations - use actual generation numbers
    invocationsByGeneration.forEach((genData) => {
      genData.invocations.forEach((inv) => {
        if (inv.accuracy !== undefined) {
          allData.push({
            generation: genData.generation,
            accuracy: inv.accuracy,
            invocationId: inv.invocationId,
            timestamp: inv.startTime,
            isTarget: inv.invocationId === targetNodeId,
            type: "invocation",
          })
        }
      })
    })

    // Add average line data
    invocationsByGeneration.forEach((genData) => {
      allData.push({
        generation: genData.generation,
        averageAccuracy: genData.averageAccuracy,
        type: "average",
      })
    })
  }

  return allData.sort((a, b) => a.generation - b.generation)
}

function renderScatterPoint(props: any) {
  const { cx, cy, payload } = props
  const isTarget = payload.isTarget

  return (
    <circle
      cx={cx}
      cy={cy}
      r={isTarget ? 6 : 3}
      fill={isTarget ? "#10b981" : "#2563eb"}
      stroke={isTarget ? "#065f46" : "#1d4ed8"}
      strokeWidth={isTarget ? 2 : 1}
    />
  )
}

export function WorkflowEvolutionVisualization({
  graph,
  visualization,
  runInfo,
}: EvolutionVisualizationProps) {
  const {
    summary,
    timeline: _timeline,
    milestones,
    invocationsByGeneration,
  } = visualization

  // Memoize expensive chart data calculations
  const chartData = useMemo(() => {
    return prepareChartData(invocationsByGeneration, graph?.targetNode?.invocationId || "")
  }, [invocationsByGeneration, graph?.targetNode?.invocationId])

  const { successCount, failureCount, successRate } = useMemo(() => {
    if (!invocationsByGeneration) return { successCount: 0, failureCount: 0, successRate: 0 }
    
    let success = 0
    let failure = 0
    
    invocationsByGeneration.forEach(gen => {
      gen.invocations.forEach(inv => {
        if (inv.accuracy !== undefined && inv.accuracy > 0) {
          success++
        } else {
          failure++
        }
      })
    })
    
    const total = success + failure
    return {
      successCount: success,
      failureCount: failure,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0
    }
  }, [invocationsByGeneration])

  const isStaleRun = (run: { status: string; start_time: string }) => {
    if (run.status !== "running") return false
    const startTime = new Date(run.start_time).getTime()
    const currentTime = new Date().getTime()
    const elapsedHours = (currentTime - startTime) / (1000 * 60 * 60)
    return elapsedHours > 5
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Run Details Block - if available */}
      {runInfo && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Run Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Run ID:
              </div>
              <div className="font-medium text-gray-900 dark:text-gray-100 font-mono text-sm">
                {runInfo.run_id}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Goal:
              </div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {runInfo.goal_text}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Status:
              </div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  runInfo.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : runInfo.status === "running"
                      ? isStaleRun(runInfo)
                        ? "bg-orange-100 text-orange-800"
                        : "bg-blue-100 text-blue-800"
                      : runInfo.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : runInfo.status === "interrupted"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                }`}
              >
                {runInfo.status === "running" && isStaleRun(runInfo)
                  ? "stale"
                  : runInfo.status}
              </span>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Started:
              </div>
              <div className="text-gray-900 dark:text-gray-100">
                {new Date(runInfo.start_time).toLocaleString()}
              </div>
            </div>
            {runInfo.end_time && (
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Ended:
                </div>
                <div className="text-gray-900 dark:text-gray-100">
                  {new Date(runInfo.end_time).toLocaleString()}
                </div>
              </div>
            )}
            {runInfo.total_invocations !== undefined && (
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Invocations:
                </div>
                <div className="text-gray-900 dark:text-gray-100">
                  {runInfo.total_invocations}
                </div>
              </div>
            )}
          </div>
          {runInfo.notes && (
            <div className="mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Notes:
              </div>
              <div className="text-sm text-gray-900 dark:text-gray-100">
                {runInfo.notes}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Cultural Evolution Journey
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          From 10% to {summary.targetAccuracy}% accuracy through cultural
          evolution (iterative improvement)
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">
            {summary.targetAccuracy}%
          </div>
          <div className="text-sm text-gray-600">Target Accuracy</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">
            {summary.peakAccuracy}%
          </div>
          <div className="text-sm text-gray-600">Peak Accuracy</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">
            {summary.totalIterations}
          </div>
          <div className="text-sm text-gray-600">Total Invocations</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-orange-600">
            {summary.successRate}%
          </div>
          <div className="text-sm text-gray-600">Success Rate</div>
        </div>
        <div className="bg-indigo-50 p-4 rounded-lg text-center">
          <div className="text-lg font-bold text-indigo-600">Cultural</div>
          <div className="text-sm text-gray-600">Evolution Mode</div>
        </div>
      </div>

      {/* Evolution Goal */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Evolution Goal</h3>
        <p className="text-gray-700 leading-relaxed">{summary.evolutionGoal}</p>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Duration:</span>{" "}
            {summary.evolutionDuration} hours
          </div>
          <div>
            <span className="font-medium">Total Cost:</span> $
            {summary.totalCost}
          </div>
          <div>
            <span className="font-medium">Mode:</span> Cultural Evolution
          </div>
        </div>
      </div>

      {/* Accuracy Timeline Chart */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">
          Accuracy Progression Over Time
        </h3>
        {!invocationsByGeneration || invocationsByGeneration.length === 0 ? (
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            <p>No generation data available. Using timeline view.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="generation"
                label={{
                  value:
                    invocationsByGeneration.length === 1
                      ? "Invocation Order"
                      : "Generation",
                  position: "insideBottom",
                  offset: -5,
                }}
                domain={["dataMin", "dataMax"]}
                type="number"
              />
              <YAxis
                label={{
                  value: "Accuracy (%)",
                  angle: -90,
                  position: "insideLeft",
                }}
                domain={[0, 100]}
              />
              <Tooltip
                content={({ active, payload, label: _label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    const isSingleGen = invocationsByGeneration.length === 1
                    if (data.type === "invocation") {
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-medium">
                            {isSingleGen
                              ? `Invocation ${data.generation + 1}`
                              : `Generation ${data.generation}`}
                          </p>
                          <p className="text-blue-600">
                            Accuracy: {data.accuracy}%
                          </p>
                          <p className="text-gray-500 text-xs">
                            ID: {data.invocationId}
                          </p>
                          <p className="text-gray-500 text-xs">
                            {new Date(data.timestamp).toLocaleString()}
                          </p>
                          {data.isTarget && (
                            <p className="text-green-600 font-medium">
                              🎯 Target
                            </p>
                          )}
                        </div>
                      )
                    } else {
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-medium">
                            {isSingleGen
                              ? "Overall Average"
                              : `Generation ${data.generation}`}
                          </p>
                          <p className="text-purple-600">
                            Average: {data.averageAccuracy?.toFixed(1)}%
                          </p>
                        </div>
                      )
                    }
                  }
                  return null
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="averageAccuracy"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="Average Accuracy"
              />
              <Scatter
                dataKey="accuracy"
                fill="#2563eb"
                shape={renderScatterPoint}
                name="Individual Invocations"
              />
              <ReferenceLine
                y={summary.targetAccuracy}
                stroke="#10b981"
                strokeDasharray="5 5"
                label={{
                  value: `Target: ${summary.targetAccuracy}%`,
                  position: "top",
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>


      {/* Success vs Failure Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Success Distribution</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span>Successful Runs</span>
              <span className="font-medium text-green-600">
                {successCount} ({successRate}%)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Failed Runs</span>
              <span className="font-medium text-red-600">
                {failureCount} ({100 - successRate}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{ width: `${successRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Average Accuracy:</span>
              <span className="font-medium">
                {graph.stats.averageAccuracy.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Peak Fitness Score:</span>
              <span className="font-medium">
                {graph.stats.peakFitnessScore}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Cost per Successful Run:</span>
              <span className="font-medium">
                $
                {(
                  graph.stats.totalCost / graph.stats.successfulInvocations
                ).toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Evolution Method:</span>
              <span className="font-medium">Cultural (Iterative)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Generation Details */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Evolution Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">Evolution Run ID:</span>
            <br />
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">
              {graph.evolutionRun.runId}
            </code>
          </div>
          <div>
            <span className="font-medium">Generation:</span>
            <br />
            <span>
              #{graph.generation.number} ({graph.generation.generationId})
            </span>
          </div>
          <div>
            <span className="font-medium">Target Invocation:</span>
            <br />
            <code className="text-xs bg-green-100 px-2 py-1 rounded">
              {graph.targetNode.invocationId}
            </code>
          </div>
        </div>
      </div>
    </div>
  )
}
