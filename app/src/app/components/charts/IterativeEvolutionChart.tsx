"use client"

import { useMemo } from "react"
import {
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
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

interface ClusteredPoint {
  generation: number
  accuracy: number
  count: number
  hasTarget: boolean
  invocationIds: string[]
  timestamps: string[]
  type: "cluster"
}

interface AveragePoint {
  generation: number
  averageAccuracy: number
  type: "average"
}

function buildSeriesData(
  invocationsByGeneration: GenerationData[] | undefined,
  targetNodeId: string
): {
  points: ClusteredPoint[]
  averages: AveragePoint[]
  isSingleGen: boolean
} {
  if (!invocationsByGeneration || invocationsByGeneration.length === 0)
    return { points: [], averages: [], isSingleGen: false }

  const uniqueGenerations = new Set(
    invocationsByGeneration.map((g) => g.generation)
  )
  const isSingleGeneration = uniqueGenerations.size === 1

  // Collect raw points first
  type RawPoint = {
    generation: number
    accuracy: number
    invocationId: string
    timestamp: string
    isTarget: boolean
  }
  const rawPoints: RawPoint[] = []

  if (isSingleGeneration && invocationsByGeneration[0]) {
    const singleGenData = invocationsByGeneration[0]
    const invocationsWithAccuracy = singleGenData.invocations.filter(
      (inv) => inv.accuracy !== undefined
    )
    invocationsWithAccuracy.forEach((inv, index) => {
      rawPoints.push({
        generation: index,
        accuracy: inv.accuracy!,
        invocationId: inv.invocationId,
        timestamp: inv.startTime,
        isTarget: inv.invocationId === targetNodeId,
      })
    })
  } else {
    invocationsByGeneration.forEach((genData) => {
      genData.invocations.forEach((inv) => {
        if (inv.accuracy !== undefined) {
          rawPoints.push({
            generation: genData.generation,
            accuracy: inv.accuracy,
            invocationId: inv.invocationId,
            timestamp: inv.startTime,
            isTarget: inv.invocationId === targetNodeId,
          })
        }
      })
    })
  }

  // Cluster identical coordinates (exact same generation and accuracy)
  const clusterMap = new Map<string, ClusteredPoint>()
  for (const p of rawPoints) {
    const key = `${p.generation}|${p.accuracy}`
    const existing = clusterMap.get(key)
    if (!existing) {
      clusterMap.set(key, {
        generation: p.generation,
        accuracy: p.accuracy,
        count: 1,
        hasTarget: p.isTarget,
        invocationIds: [p.invocationId],
        timestamps: [p.timestamp],
        type: "cluster",
      })
    } else {
      existing.count += 1
      if (p.isTarget) existing.hasTarget = true
      existing.invocationIds.push(p.invocationId)
      existing.timestamps.push(p.timestamp)
    }
  }

  const points = Array.from(clusterMap.values()).sort(
    (a, b) => a.generation - b.generation || a.accuracy - b.accuracy
  )

  // Build averages series
  const averages: AveragePoint[] = []
  if (isSingleGeneration && invocationsByGeneration[0]) {
    const singleGenData = invocationsByGeneration[0]
    const invocationsWithAccuracy = singleGenData.invocations.filter(
      (inv) => inv.accuracy !== undefined
    )
    if (invocationsWithAccuracy.length > 0) {
      averages.push({
        generation: 0,
        averageAccuracy: singleGenData.averageAccuracy,
        type: "average",
      })
      averages.push({
        generation: invocationsWithAccuracy.length - 1,
        averageAccuracy: singleGenData.averageAccuracy,
        type: "average",
      })
    }
  } else {
    invocationsByGeneration.forEach((genData) => {
      averages.push({
        generation: genData.generation,
        averageAccuracy: genData.averageAccuracy,
        type: "average",
      })
    })
  }

  return { points, averages, isSingleGen: isSingleGeneration }
}

function renderScatterPoint(props: any) {
  const { cx, cy, payload } = props
  const count: number = payload.count ?? 1
  const hasTarget: boolean = payload.hasTarget ?? false

  // Scale radius by sqrt of count to keep growth reasonable
  const baseRadius = 3
  const scaledRadius = Math.min(14, baseRadius + Math.sqrt(count) * 2)

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={scaledRadius}
        fill="#2563eb"
        stroke="#1d4ed8"
        strokeWidth={1}
        opacity={0.9}
      />
      {hasTarget && (
        <circle
          cx={cx}
          cy={cy}
          r={scaledRadius + 2}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
        />
      )}
    </g>
  )
}

export function IterativeEvolutionChart({
  invocationsByGeneration,
  targetNodeId,
  targetAccuracy,
}: {
  invocationsByGeneration?: GenerationData[]
  targetNodeId: string
  targetAccuracy: number
}) {
  const {
    points: scatterData,
    averages: averageData,
    isSingleGen,
  } = useMemo(
    () => buildSeriesData(invocationsByGeneration, targetNodeId),
    [invocationsByGeneration, targetNodeId]
  )

  return (
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
          <ComposedChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="generation"
              label={{
                value: isSingleGen ? "Invocation Order" : "Generation",
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
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d: any = payload[0].payload
                  if (d?.type === "cluster") {
                    const header = isSingleGen
                      ? `Invocation ${d.generation + 1}`
                      : `Generation ${d.generation}`
                    const timePreview = d.timestamps?.[0]
                      ? new Date(d.timestamps[0]).toLocaleString()
                      : ""
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-medium">{header}</p>
                        <p className="text-blue-600">Accuracy: {d.accuracy}%</p>
                        <p className="text-gray-600">Count: {d.count}</p>
                        {d.hasTarget && (
                          <p className="text-green-600 font-medium">
                            🎯 Target in cluster
                          </p>
                        )}
                        {timePreview && (
                          <p className="text-gray-500 text-xs">{timePreview}</p>
                        )}
                      </div>
                    )
                  }
                  if (d?.type === "average") {
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-medium">
                          {isSingleGen
                            ? "Overall Average"
                            : `Generation ${d.generation}`}
                        </p>
                        <p className="text-purple-600">
                          Average: {Number(d.averageAccuracy).toFixed(1)}%
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
              data={averageData}
            />
            <Scatter
              dataKey="accuracy"
              fill="#2563eb"
              shape={renderScatterPoint}
              name="Invocations (clustered)"
              data={scatterData}
            >
              <LabelList
                dataKey="count"
                position="top"
                formatter={(label) =>
                  typeof label === "number" && label > 1 ? String(label) : ""
                }
                fill="#374151"
                fontSize={10}
              />
            </Scatter>
            <ReferenceLine
              y={targetAccuracy}
              stroke="#10b981"
              strokeDasharray="5 5"
              label={{ value: `Target: ${targetAccuracy}%`, position: "top" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
