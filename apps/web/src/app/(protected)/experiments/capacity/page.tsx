import type { ToolCapacityExperimentResponse } from "@/app/api/experiments/capacity/route"
import { DevOnly } from "@/components/DevOnly"
import type { ToolCapacityResult } from "@lucky/experiments/tool-real/experiments/01-capacity-limits/main-experiment"
import AccuracyByModelChart from "./components/AccuracyByModelChart"
import AccuracyByToolCountChart from "./components/AccuracyByToolCountChart"

type LineRow = { tools: number } & Record<string, number>
type SeriesDef = { key: string; label: string }
type Point = { tools: number; y: number; modelKey: string; label: string }

function sanitizeKey(input: string): string {
  return input.replace(/[^a-zA-Z0-9_]/g, "_")
}

async function fetchCapacityData(): Promise<ToolCapacityExperimentResponse | null> {
  try {
    const res = await fetch("/api/experiments/capacity", {
      cache: "no-store",
    })
    if (!res.ok) return null

    const json = await res.json()
    if (!isToolCapacityExperimentResponse(json)) {
      console.error("Invalid response from capacity experiment", json)
      return null
    }
    return json
  } catch {
    return null
  }
}

function isToolCapacityExperimentResponse(response: unknown): response is ToolCapacityExperimentResponse {
  return (
    response !== null &&
    typeof response === "object" &&
    "ok" in response &&
    typeof (response as any).ok === "boolean" &&
    "analysis" in response &&
    typeof (response as any).analysis === "object" &&
    "results" in response &&
    typeof (response as any).results === "object" &&
    "files" in response &&
    typeof (response as any).files === "object"
  )
}

function toLineData(data: Awaited<ReturnType<typeof fetchCapacityData>>): {
  rows: LineRow[]
  series: SeriesDef[]
  points: Point[]
  usageRows: LineRow[]
} {
  if (!data || !data.results) return { rows: [], series: [], points: [], usageRows: [] }

  const results: Array<ToolCapacityResult> = (data.results as any).results || []

  if (!Array.isArray(results) || results.length === 0) return { rows: [], series: [], points: [], usageRows: [] }

  const uniqueModels = Array.from(new Set(results.map(r => String(r.model))))
  const series: SeriesDef[] = uniqueModels.map(m => ({
    key: sanitizeKey(m),
    label: m,
  }))
  const uniqueToolCounts = Array.from(new Set(results.map(r => Number(r.toolCount)))).sort((a, b) => a - b)

  const rows: LineRow[] = uniqueToolCounts.map(tc => {
    const row: LineRow = { tools: tc }
    for (const model of uniqueModels) {
      const subset = results.filter(r => r.toolCount === tc && String(r.model) === model)
      const accuracy = subset.length > 0 ? (subset.filter(r => r.success).length / subset.length) * 100 : 0
      row[sanitizeKey(model)] = Math.round(accuracy * 10) / 10
    }
    return row
  })

  // Aggregate per (model, toolCount, promptId) across runs to show per-prompt accuracy dots
  type Agg = {
    model: string
    toolCount: number
    promptId: string
    successes: number
    total: number
  }
  const aggMap = new Map<string, Agg>()
  for (const r of results) {
    const pid = String(r.promptId ?? "unknown")
    const key = `${r.model}|${r.toolCount}|${pid}`
    const cur =
      aggMap.get(key) ||
      ({
        model: String(r.model),
        toolCount: Number(r.toolCount),
        promptId: pid,
        successes: 0,
        total: 0,
      } as Agg)
    cur.total += 1
    if (r.success) cur.successes += 1
    aggMap.set(key, cur)
  }

  // Group by (modelKey, toolCount) and apply slight x-jitter per prompt for visibility
  const byModelTool = new Map<string, Agg[]>()
  for (const agg of aggMap.values()) {
    const mk = sanitizeKey(agg.model)
    const key = `${mk}|${agg.toolCount}`
    const arr = byModelTool.get(key) || []
    arr.push(agg)
    byModelTool.set(key, arr)
  }

  const points: Point[] = []
  const jitterStep = 0.08
  for (const [, arr] of byModelTool) {
    arr.sort((a, b) => a.promptId.localeCompare(b.promptId))
    const n = arr.length
    const center = (n - 1) / 2
    arr.forEach((agg, idx) => {
      const accuracy = (agg.successes / Math.max(1, agg.total)) * 100
      const mk = sanitizeKey(agg.model)
      const jitteredTools = agg.toolCount + (idx - center) * jitterStep
      points.push({
        tools: jitteredTools,
        y: Math.round(accuracy * 10) / 10,
        modelKey: mk,
        label: agg.model,
      })
    })
  }

  // compute usage index rows for right axis
  const usageRows: LineRow[] = uniqueToolCounts.map(tc => {
    const row: LineRow = { tools: tc }
    for (const model of uniqueModels) {
      const subset = results.filter(r => r.toolCount === tc && String(r.model) === model)
      if (subset.length === 0) {
        row[sanitizeKey(model)] = 0
        continue
      }
      const avgLatency = subset.reduce((s, r) => s + (r.latencyMs || 0), 0) / subset.length
      const avgCost = subset.reduce((s, r) => s + (r.usdCost || 0), 0) / subset.length
      const avgCalls = subset.reduce((s, r) => s + (r.toolCallCount || 0), 0) / subset.length

      const callsPenalty = avgCalls > 3 ? 20 : 0
      const latencyScore = Math.min(100, (avgLatency / 5000) * 100)
      const costScore = Math.min(100, avgCost * 100)
      const usage = Math.min(100, latencyScore * 0.7 + costScore * 0.3 + callsPenalty)
      row[sanitizeKey(model)] = Math.round(usage * 10) / 10
    }
    return row
  })

  return { rows, series, points, usageRows }
}

export default async function CapacityPage() {
  const data = await fetchCapacityData()
  const { rows: lineData, series, points } = toLineData(data)
  const barData = (data?.analysis?.modelPerformance || []).map(m => ({
    model: m.model,
    accuracy: Math.round(m.accuracy * 10) / 10,
  }))

  return (
    <DevOnly>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tool Selection Capacity — Results</h1>
          <p className="text-gray-600 mb-6">Accuracy vs number of available tools, and average accuracy by model.</p>

          <div className="grid grid-cols-1 gap-8">
            <div className="w-full h-[520px] bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-2">Accuracy vs Tool Count</h2>
              <AccuracyByToolCountChart data={lineData} series={series} points={points} />
            </div>

            <div className="w-full h-[380px] bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-2">Accuracy by Model</h2>
              <AccuracyByModelChart data={barData} />
            </div>
          </div>
        </div>
      </div>
    </DevOnly>
  )
}
