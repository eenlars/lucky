"use client"

import { axes, semantic, seriesPalette } from "@/app/(protected)/experiments/chartColors"
import { useEffect, useMemo, useState } from "react"
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"

import type { OpenRouterModelName } from "@lucky/core/utils/spending/models.types"
import {
  accuracyScorePct,
  costTimeBalancedScorePct,
} from "@lucky/experiments/tool-real/experiments/03-context-adaptation/analyze/metrics"
import { MODELS, TEST_SCENARIOS } from "@lucky/experiments/tool-real/experiments/03-context-adaptation/constants"
import type {
  Condition,
  OurAlgorithmExperimentResults,
  OurAlgorithmRun,
} from "@lucky/experiments/tool-real/experiments/03-context-adaptation/types"

type ShapeName = "circle" | "cross" | "diamond" | "square" | "star" | "triangle" | "wye"

type PointDatum = {
  xEfficiencyPct: number
  yAccuracyPct: number
  yFinalPct?: number
  costTimePct?: number
  zCost: number
  model: string
  condition: Condition
  scenario: string
  successItems: number
  expectedItems: number
  actualCalls: number
  minimalCalls: number
  durationMs: number
  adapted: boolean
  avgAdherence: number
  avgErrorRate: number
}

// Convert model id to a readable display label
function formatModelDisplayName(modelId: string): string {
  const raw = modelId.includes("/") ? modelId.split("/")[1] : modelId
  const withDecimals = raw.replace(/(\d)-(\d)/g, "$1.$2")
  const spaced = withDecimals.replace(/-/g, " ")
  const words = spaced
    .split(" ")
    .filter(Boolean)
    .map(w => {
      const lower = w.toLowerCase()
      if (lower === "gpt") return "GPT"
      if (lower === "gemini") return "Gemini"
      if (lower === "claude") return "Claude"
      if (lower === "flash") return "Flash"
      if (lower === "lite") return "Lite"
      if (lower === "pro") return "Pro"
      if (lower === "preview") return "Preview"
      if (/^\d+(?:\.\d+)?o$/i.test(lower)) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
  return words.join(" ")
}

type Connection = {
  key: string
  color: string
  data: Array<{ costTimePct: number | null; yAccuracyPct: number | null }>
}

const MODEL_SHAPES: ShapeName[] = ["circle", "triangle", "diamond", "square"]

function computeModelOrder(runs: OurAlgorithmRun[]): string[] {
  const fromResults = Array.from(new Set(runs.map(r => r.model))) as OpenRouterModelName[]
  const preferred = MODELS
  const order: OpenRouterModelName[] = []
  for (const m of preferred) if (fromResults.includes(m)) order.push(m)
  for (const m of fromResults) if (!order.includes(m)) order.push(m)
  return order.map(m => String(m))
}

function aggregateLoopMetrics(run: OurAlgorithmRun) {
  const loops = run.loops ?? []
  const n = loops.length || 1
  let adherenceSum = 0
  let errorRateSum = 0
  let combineCalls = 0
  for (const l of loops) {
    adherenceSum += l.metrics.adherenceToLimit ?? 0
    errorRateSum += l.metrics.errorRate ?? 0
    combineCalls += l.metrics.combineCallsCount ?? 0
  }
  return {
    avgAdherence: adherenceSum / n,
    avgErrorRate: errorRateSum / n,
    totalCombineCalls: combineCalls,
  }
}

function buildPoints(results: OurAlgorithmExperimentResults | null): {
  modelOrder: string[]
  allPoints: PointDatum[]
} {
  if (!results) return { modelOrder: [], allPoints: [] }
  const expectedByScenario = Object.fromEntries(TEST_SCENARIOS.map(s => [s.id, s.expected])) as Record<string, number>

  const modelOrder = computeModelOrder(results.runs)
  const allPoints: PointDatum[] = []

  for (const run of results.runs) {
    const expected = expectedByScenario[run.scenario]
    if (!expected) continue
    const _successPct = (run.successItems / expected) * 100
    const accuracyPct = accuracyScorePct(run.successItems, expected)
    const minimalCalls = Math.max(1, Math.ceil(expected / 3))
    const actualCalls = Math.max(0, run.totalFetchCalls || 0)
    const efficiencyPct = actualCalls > 0 ? Math.min(100, Math.max(0, (minimalCalls / actualCalls) * 100)) : 0

    const loopAgg = aggregateLoopMetrics(run)
    // Compute cost-time efficiency and an optional final score (unused in axes but useful for debugging)
    const costTimePct = costTimeBalancedScorePct(run.cost ?? 0, run.durationMs ?? 0)
    const finalPct = (accuracyPct / 100) * costTimePct

    allPoints.push({
      xEfficiencyPct: efficiencyPct,
      yAccuracyPct: accuracyPct,
      yFinalPct: finalPct,
      costTimePct,
      zCost: Math.max(0.0001, run.cost ?? 0),
      model: run.model,
      condition: run.condition as Condition,
      scenario: run.scenario,
      successItems: run.successItems,
      expectedItems: expected,
      actualCalls,
      minimalCalls,
      durationMs: run.durationMs ?? 0,
      adapted: !!run.adapted,
      avgAdherence: loopAgg.avgAdherence,
      avgErrorRate: loopAgg.avgErrorRate,
    })
  }
  return { modelOrder, allPoints }
}

function formatPct(n: number): string {
  return `${n.toFixed(0)}%`
}

function formatMs(ms: number): string {
  if (ms < 1_000) return `${ms} ms`
  const s = ms / 1_000
  if (s < 60) return `${s.toFixed(1)} s`
  const m = Math.floor(s / 60)
  const rs = Math.round(s % 60)
  return `${m}m ${rs}s`
}

function PointShape({ cx, cy, payload, size = 80, modelOrder }: any) {
  if (cx == null || cy == null) return null
  const p: PointDatum = payload
  const modelIdx = Math.max(0, modelOrder.indexOf(p.model))
  const shape = MODEL_SHAPES[modelIdx % MODEL_SHAPES.length]
  const color = seriesPalette[modelIdx % seriesPalette.length]
  const r = Math.max(4, Math.min(14, Math.round((size as number) / 10)))
  const common = {
    stroke: p.condition === "vague" ? color : semantic.neutralStrong,
    strokeWidth: p.condition === "vague" ? 2 : 1,
    fill: p.condition === "vague" ? "white" : color,
    fillOpacity: p.condition === "vague" ? 0.95 : 0.9,
  }
  switch (shape) {
    case "triangle":
      return <polygon points={`${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`} {...common} />
    case "diamond":
      return <polygon points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`} {...common} />
    case "square":
      return <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} rx={2} {...common} />
    default:
      return <circle cx={cx} cy={cy} r={r} {...common} />
  }
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const raw = payload[0]?.payload
  if (!raw || typeof raw !== "object" || raw == null) return null
  const p = raw as Partial<PointDatum>
  // Use a neutral color in tooltip to avoid relying on outer scope
  const color = seriesPalette[0]
  return (
    <div className="rounded-md border border-gray-200 bg-white p-2 shadow-sm text-xs max-w-[320px]">
      <div className="font-semibold text-gray-900 mb-1">
        <span className="inline-block h-2 w-2 rounded-full mr-2" style={{ background: color }} />
        {formatModelDisplayName(String(p.model ?? ""))} · {p.scenario} · {p.condition}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div className="text-gray-600">Call efficiency</div>
        <div className="text-gray-900">{formatPct(Number(p.xEfficiencyPct ?? 0))}</div>
        <div className="text-gray-600">Accuracy score</div>
        <div className="text-gray-900">{formatPct(Number(p.yAccuracyPct ?? 0))}</div>
        <div className="text-gray-600">Items vs expected</div>
        <div className="text-gray-900">
          {Number(p.successItems ?? 0)} / {Number(p.expectedItems ?? 0)}
        </div>
        <div className="text-gray-600">Fetch calls</div>
        <div className="text-gray-900">
          {Number(p.actualCalls ?? 0)} (min {Number(p.minimalCalls ?? 0)})
        </div>
        <div className="text-gray-600">Cost</div>
        <div className="text-gray-900">${Number(p.zCost ?? 0).toFixed(4)}</div>
        <div className="text-gray-600">Duration</div>
        <div className="text-gray-900">{formatMs(Number(p.durationMs ?? 0))}</div>
        <div className="text-gray-600">Adapted</div>
        <div className="text-gray-900">{p.adapted ? "Yes" : "No"}</div>
        <div className="text-gray-600">Avg adherence</div>
        <div className="text-gray-900">{formatPct(Number((p.avgAdherence ?? 0) * 100))}</div>
        <div className="text-gray-600">Avg error rate</div>
        <div className="text-gray-900">{formatPct(Number((p.avgErrorRate ?? 0) * 100))}</div>
      </div>
    </div>
  )
}

export default function AdaptationOurAlgorithmConnected({
  className = "",
}: {
  className?: string
}) {
  const [data, setData] = useState<OurAlgorithmExperimentResults | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const res = await fetch(
          `/research-experiments/tool-real/experiments/03-context-adaptation/adaptive-results.json?t=${Date.now()}`,
          { cache: "no-store" },
        )
        if (!res.ok) throw new Error(`Failed to load results: ${res.status}`)
        const json = (await res.json()) as OurAlgorithmExperimentResults
        if (!cancelled) setData(json)
      } catch (e: any) {
        if (!cancelled) setErrors([(e?.message ?? String(e)) as string])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [])

  const { modelOrder, allPoints } = useMemo(() => buildPoints(data), [data])

  // Aggregate across enabled scenarios per (model, condition)
  const aggregatedPoints = useMemo(() => {
    type Acc = {
      model: string
      condition: Condition
      count: number
      sumX: number
      sumY: number
      sumFinal: number
      sumCostTime: number
      sumCost: number
      sumDuration: number
    }
    const acc: Record<string, Acc> = {}
    for (const p of allPoints) {
      const key = `${p.model}|${p.condition}`
      if (!acc[key]) {
        acc[key] = {
          model: p.model,
          condition: p.condition,
          count: 0,
          sumX: 0,
          sumY: 0,
          sumFinal: 0,
          sumCostTime: 0,
          sumCost: 0,
          sumDuration: 0,
        }
      }
      const a = acc[key]
      a.count += 1
      a.sumX += p.xEfficiencyPct
      a.sumY += p.yAccuracyPct
      a.sumFinal += p.yFinalPct ?? 0
      a.sumCostTime += p.costTimePct ?? 0
      a.sumCost += p.zCost
      a.sumDuration += p.durationMs
    }
    const out: PointDatum[] = []
    for (const a of Object.values(acc)) {
      const n = Math.max(1, a.count)
      out.push({
        xEfficiencyPct: a.sumX / n,
        yAccuracyPct: a.sumY / n,
        yFinalPct: a.sumFinal / n,
        costTimePct: a.sumCostTime / n,
        zCost: a.sumCost / n,
        model: a.model,
        condition: a.condition,
        scenario: "combined",
        successItems: 0,
        expectedItems: 0,
        actualCalls: 0,
        minimalCalls: 0,
        durationMs: a.sumDuration / n,
        adapted: false,
        avgAdherence: 0,
        avgErrorRate: 0,
      })
    }
    return out
  }, [allPoints])

  // Build connection segments between vague and clear for each (model, scenario)
  const connections = useMemo<Connection[]>(() => {
    const byModel: Record<string, { vague?: PointDatum; clear?: PointDatum }> = {}
    for (const p of aggregatedPoints) {
      if (!byModel[p.model]) {
        byModel[p.model] = {}
      }
      const bucket = byModel[p.model]
      if (p.condition === "vague") bucket.vague = p
      else bucket.clear = p
    }
    const lines: Connection[] = []
    for (const [model, b] of Object.entries(byModel)) {
      if (b.vague && b.clear) {
        const idx = Math.max(0, modelOrder.indexOf(model))
        const color = seriesPalette[idx % seriesPalette.length]
        lines.push({
          key: model,
          color,
          data: [
            {
              costTimePct: b.vague.costTimePct ?? null,
              yAccuracyPct: b.vague.yAccuracyPct,
            },
            {
              costTimePct: b.clear.costTimePct ?? null,
              yAccuracyPct: b.clear.yAccuracyPct,
            },
            { costTimePct: null, yAccuracyPct: null },
          ],
        })
      }
    }
    return lines
  }, [aggregatedPoints, modelOrder])

  const aggregatedClearPoints = useMemo(() => aggregatedPoints.filter(p => p.condition === "clear"), [aggregatedPoints])

  const hasAny = aggregatedPoints.length > 0

  return (
    <div className={`w-full bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <div>
          <h2 className="text-lg font-semibold">All models · Baseline connections</h2>
          <p className="text-[11px] text-gray-500">
            Aggregated across all scenarios; lines connect Vague → Clear per model.
          </p>
        </div>
      </div>

      {/* Model legend */}
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
        {modelOrder.map((m, idx) => (
          <div key={m} className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded"
              style={{ background: seriesPalette[idx % seriesPalette.length] }}
            />
            <span className="text-gray-700">{formatModelDisplayName(m)}</span>
          </div>
        ))}
      </div>

      {loading && <div className="text-xs text-gray-500">Loading…</div>}
      {!loading && !hasAny && <div className="text-xs text-gray-500">No points available.</div>}
      {errors.length > 0 && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mb-3">
          <strong>Errors:</strong> {errors.join("; ")}
        </div>
      )}

      <div className="w-full h-[520px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart margin={{ top: 8, right: 12, bottom: 20, left: 36 }}>
            <CartesianGrid stroke={axes.grid} strokeDasharray="4 4" />
            <XAxis
              type="number"
              dataKey="costTimePct"
              name="Usage score (%)"
              label={{
                value: "usage score (%)",
                position: "insideBottom",
                offset: -12,
                fill: axes.label,
              }}
              tick={{ fontSize: 10, fill: axes.label }}
              axisLine={{ stroke: axes.axisLine }}
              tickLine={{ stroke: axes.tickLine }}
              allowDecimals={false}
              domain={[0, 100]}
            />
            <YAxis
              type="number"
              dataKey="yAccuracyPct"
              name="Accuracy (%)"
              label={{
                value: "accuracy (%)",
                angle: -90,
                position: "insideLeft",
                offset: 8,
                fill: axes.label,
              }}
              tickFormatter={v => `${v}%`}
              tick={{ fontSize: 10, fill: axes.label }}
              axisLine={{ stroke: axes.axisLine }}
              tickLine={{ stroke: axes.tickLine }}
              domain={[0, 100]}
            />
            <ZAxis dataKey="zCost" name="Cost ($)" range={[60, 120]} />
            <ReferenceLine y={100} stroke={axes.referenceLine} strokeDasharray="4 4" ifOverflow="extendDomain" />
            <Tooltip content={<CustomTooltip />} />

            {/* Pair connections (one Line per model, aggregated across scenarios) */}
            {connections.map(c => (
              <Line
                key={c.key}
                data={c.data}
                type="linear"
                dataKey="yAccuracyPct"
                dot={false}
                stroke={c.color}
                strokeWidth={2}
                strokeOpacity={0.6}
                isAnimationActive={false}
              />
            ))}

            {/* Aggregated points */}
            <Scatter
              data={aggregatedPoints}
              shape={(props: any) => <PointShape {...props} modelOrder={modelOrder} />}
            />

            {/* Invisible scatter for tooltip positioning (accuracy on Y) */}
            <Scatter data={aggregatedPoints} fillOpacity={0} shape={() => <g />} dataKey="yAccuracyPct" />

            {/* Labels at clear endpoints with model names */}
            <Scatter
              data={aggregatedClearPoints}
              shape={() => <g />}
              label={(props: any) => {
                const { x, y, payload } = props || {}
                if (typeof x !== "number" || typeof y !== "number" || !payload) return <g />
                const text = formatModelDisplayName(String(payload.model))
                return (
                  <text x={x + 5} y={y - 5} fontSize={9} fill={axes.label}>
                    {text}
                  </text>
                )
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
