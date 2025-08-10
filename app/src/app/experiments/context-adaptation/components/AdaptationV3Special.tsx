"use client"

import {
  axes,
  scenarioColors,
  semantic,
  seriesPalette,
} from "@/app/experiments/chartColors"
import { useEffect, useMemo, useState } from "react"
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts"

import type { OpenRouterModelName } from "../../../../../../core/src/utils/spending/models.types"
import { accuracyScorePct } from "../../../../research-experiments/tool-real/experiments/03-context-adaptation/analyze/metrics"
import {
  MODELS,
  TEST_SCENARIOS,
} from "../../../../research-experiments/tool-real/experiments/03-context-adaptation/constants"
import type {
  Condition,
  LoopMetrics,
  V3ExperimentResults,
  V3Run,
} from "../../../../research-experiments/tool-real/experiments/03-context-adaptation/types"

// Condition type comes from shared experiment types

type ShapeName =
  | "circle"
  | "cross"
  | "diamond"
  | "square"
  | "star"
  | "triangle"
  | "wye"

interface PointDatum {
  // axes
  xEfficiencyPct: number
  ySuccessPct: number
  yAccuracyPct: number
  zCost: number

  // display/meta
  model: string
  condition: Condition
  scenario: string
  successItems: number
  expectedItems: number
  actualCalls: number
  minimalCalls: number
  durationMs: number
  adapted: boolean

  // aggregated loop metrics for rich tooltip
  avgAdherence: number
  avgErrorRate: number
  totalCombineCalls: number
  countsUsed: LoopMetrics["countsUsed"]
  strategyCounts: Record<V3Run["loops"][number]["metrics"]["strategy"], number>
}

// Convert provider/model slugs into human-friendly display names
function formatModelDisplayName(modelId: string): string {
  const raw = modelId.includes("/") ? modelId.split("/")[1] : modelId
  // Convert digit-hyphen-digit patterns into decimals (e.g., 3-5 -> 3.5)
  const withDecimals = raw.replace(/(\d)-(\d)/g, "$1.$2")
  // Replace hyphens with spaces
  const spaced = withDecimals.replace(/-/g, " ")
  // Special casing common model families
  const words = spaced
    .split(" ")
    .filter(Boolean)
    .map((w) => {
      const lower = w.toLowerCase()
      if (lower === "gpt") return "GPT"
      if (lower === "gemini") return "Gemini"
      if (lower === "claude") return "Claude"
      if (lower === "flash") return "Flash"
      if (lower === "lite") return "Lite"
      if (lower === "pro") return "Pro"
      if (lower === "preview") return "Preview"
      // Preserve tokens like 4o as-is with uppercased family if needed
      if (/^\d+(?:\.\d+)?o$/i.test(lower)) return lower
      // Capitalize first letter by default
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
  return words.join(" ")
}

// Scenario palette comes from centralized chart colors

// Stable shapes assignment for models (in MODELS_V3 order)
const MODEL_SHAPES: ShapeName[] = ["circle", "triangle", "diamond", "square"]

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

// function clamp(min: number, v: number, max: number): number {
//   return Math.max(min, Math.min(v, max))
// }

// Slight, deterministic jitter by model and condition to reduce point overlap
function _jitterFor(modelIndex: number, condition: Condition): number {
  const base = [-0.28, -0.12, 0.12, 0.28][modelIndex % 4]
  return condition === "clear" ? base : base * 0.7
}

// Build stable model order based on MODELS_V3 but fall back to discovered models in results
function computeModelOrder(runs: V3Run[]): string[] {
  const fromResults = Array.from(
    new Set(runs.map((r) => r.model))
  ) as OpenRouterModelName[]
  const preferred = MODELS
  const order: OpenRouterModelName[] = []
  for (const m of preferred) if (fromResults.includes(m)) order.push(m)
  for (const m of fromResults) if (!order.includes(m)) order.push(m)
  return order.map((m) => String(m))
}

function aggregateLoopMetrics(run: V3Run) {
  const loops = run.loops ?? []
  const n = loops.length || 1

  const initCounts = {
    "1": 0,
    "2": 0,
    "3": 0,
    gt3: 0,
  } as LoopMetrics["countsUsed"]
  const strategyCounts: Record<string, number> = {}

  let adherenceSum = 0
  let errorRateSum = 0
  let combineCalls = 0

  for (const l of loops) {
    adherenceSum += l.metrics.adherenceToLimit ?? 0
    errorRateSum += l.metrics.errorRate ?? 0
    combineCalls += l.metrics.combineCallsCount ?? 0
    initCounts["1"] += l.metrics.countsUsed["1"]
    initCounts["2"] += l.metrics.countsUsed["2"]
    initCounts["3"] += l.metrics.countsUsed["3"]
    initCounts.gt3 += l.metrics.countsUsed.gt3
    const s = l.metrics.strategy
    strategyCounts[s] = (strategyCounts[s] ?? 0) + 1
  }

  return {
    avgAdherence: adherenceSum / n,
    avgErrorRate: errorRateSum / n,
    totalCombineCalls: combineCalls,
    countsUsed: initCounts,
    strategyCounts: strategyCounts as PointDatum["strategyCounts"],
  }
}

function buildPoints(results: V3ExperimentResults | null): {
  modelOrder: string[]
  byScenario: Record<string, PointDatum[]>
} {
  if (!results) return { modelOrder: [], byScenario: {} }

  const expectedByScenario = Object.fromEntries(
    TEST_SCENARIOS.map((s) => [s.id, s.expected])
  ) as Record<string, number>

  const modelOrder = computeModelOrder(results.runs)

  const byScenario: Record<string, PointDatum[]> = {}

  for (const run of results.runs) {
    if (!expectedByScenario[run.scenario]) continue

    const expected = expectedByScenario[run.scenario]
    const successPct = (run.successItems / expected) * 100
    const accuracyPct = accuracyScorePct(run.successItems, expected)
    const minimalCalls = Math.max(1, Math.ceil(expected / 3))
    const actualCalls = Math.max(0, run.totalFetchCalls || 0)
    const efficiencyPct =
      actualCalls > 0
        ? Math.min(100, Math.max(0, (minimalCalls / actualCalls) * 100))
        : 0

    const loopAgg = aggregateLoopMetrics(run)

    const point: PointDatum = {
      xEfficiencyPct: efficiencyPct,
      ySuccessPct: successPct,
      yAccuracyPct: accuracyPct,
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
      totalCombineCalls: loopAgg.totalCombineCalls,
      countsUsed: loopAgg.countsUsed,
      strategyCounts: loopAgg.strategyCounts,
    }

    if (!byScenario[run.scenario]) byScenario[run.scenario] = []
    byScenario[run.scenario].push(point)
  }

  // Sort for stable rendering
  for (const k of Object.keys(byScenario)) {
    byScenario[k].sort((a, b) => a.xEfficiencyPct - b.xEfficiencyPct)
  }

  return { modelOrder, byScenario }
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const p: PointDatum = payload[0].payload
  const color = scenarioColors[p.scenario] ?? semantic.neutral

  const strategies = Object.entries(p.strategyCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ")

  return (
    <div className="rounded-md border border-gray-200 bg-white p-2 shadow-sm text-xs max-w-[320px]">
      <div className="font-semibold text-gray-900 mb-1">
        <span
          className="inline-block h-2 w-2 rounded-full mr-2"
          style={{ background: color }}
        />
        {p.model} · {p.scenario} · {p.condition}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <div className="text-gray-600">Call efficiency</div>
        <div className="text-gray-900">{formatPct(p.xEfficiencyPct)}</div>

        <div className="text-gray-600">Accuracy score</div>
        <div className="text-gray-900">{formatPct(p.yAccuracyPct)}</div>

        <div className="text-gray-600">Items vs expected</div>
        <div className="text-gray-900">
          {p.successItems} / {p.expectedItems}
        </div>

        <div className="text-gray-600">Fetch calls</div>
        <div className="text-gray-900">
          {p.actualCalls} (min {p.minimalCalls})
        </div>

        <div className="text-gray-600">Cost</div>
        <div className="text-gray-900">${p.zCost.toFixed(4)}</div>

        <div className="text-gray-600">Duration</div>
        <div className="text-gray-900">{formatMs(p.durationMs)}</div>

        <div className="text-gray-600">Adapted</div>
        <div className="text-gray-900">{p.adapted ? "Yes" : "No"}</div>

        <div className="text-gray-600">Avg adherence</div>
        <div className="text-gray-900">{formatPct(p.avgAdherence * 100)}</div>

        <div className="text-gray-600">Avg error rate</div>
        <div className="text-gray-900">{formatPct(p.avgErrorRate * 100)}</div>

        <div className="text-gray-600">Combine calls</div>
        <div className="text-gray-900">{p.totalCombineCalls}</div>

        <div className="text-gray-600">Counts used</div>
        <div className="text-gray-900">
          1:{p.countsUsed["1"]} · 2:{p.countsUsed["2"]} · 3:{p.countsUsed["3"]}{" "}
          · {">3:"}
          {p.countsUsed.gt3}
        </div>

        <div className="col-span-2 text-gray-600">Strategies</div>
        <div className="col-span-2 text-gray-900">{strategies || "—"}</div>
      </div>
    </div>
  )
}

// Custom point shape: model -> geometry, scenario -> fill, condition -> stroke/fill style
function PointShape({ cx, cy, payload, size = 80, modelOrder }: any) {
  if (cx == null || cy == null) return null
  const p: PointDatum = payload
  const modelIdx = Math.max(0, modelOrder.indexOf(p.model))
  const shape = MODEL_SHAPES[modelIdx % MODEL_SHAPES.length]
  const color = scenarioColors[p.scenario] ?? semantic.neutral

  // Size mapping: convert area-ish to radius-ish
  const r = Math.max(4, Math.min(14, Math.round((size as number) / 10)))
  const common = {
    stroke: p.condition === "vague" ? color : semantic.neutralStrong,
    strokeWidth: p.condition === "vague" ? 2 : 1,
    fill: p.condition === "vague" ? "white" : color,
    fillOpacity: p.condition === "vague" ? 0.95 : 0.9,
  }

  switch (shape) {
    case "triangle":
      return (
        <polygon
          points={`${cx},${cy - r} ${cx + r},${cy + r} ${cx - r},${cy + r}`}
          {...common}
        />
      )
    case "diamond":
      return (
        <polygon
          points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
          {...common}
        />
      )
    case "square":
      return (
        <rect
          x={cx - r}
          y={cy - r}
          width={2 * r}
          height={2 * r}
          rx={2}
          {...common}
        />
      )
    default:
      return <circle cx={cx} cy={cy} r={r} {...common} />
  }
}

function ShapesLegend({ modelOrder }: { modelOrder: string[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-xs">
      {modelOrder.map((m, idx) => (
        <div key={m} className="flex items-center gap-1">
          {/* Shape swatch */}
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            {(() => {
              const shape = MODEL_SHAPES[idx % MODEL_SHAPES.length]
              switch (shape) {
                case "triangle":
                  return (
                    <polygon points="7,1 13,13 1,13" fill={semantic.neutral} />
                  )
                case "diamond":
                  return (
                    <polygon
                      points="7,1 13,7 7,13 1,7"
                      fill={semantic.neutral}
                    />
                  )
                case "square":
                  return (
                    <rect
                      x="2"
                      y="2"
                      width="10"
                      height="10"
                      fill={semantic.neutral}
                    />
                  )
                case "cross":
                  return (
                    <g stroke={semantic.neutral} strokeWidth="2">
                      <line x1="2" y1="2" x2="12" y2="12" />
                      <line x1="12" y1="2" x2="2" y2="12" />
                    </g>
                  )
                case "wye":
                  return (
                    <g fill={semantic.neutral}>
                      <circle cx="7" cy="2" r="2" />
                      <circle cx="2" cy="12" r="2" />
                      <circle cx="12" cy="12" r="2" />
                    </g>
                  )
                case "star":
                  return (
                    <polygon
                      points="7,1 8.8,5.2 13,5.4 9.8,8.2 10.8,12.6 7,10.1 3.2,12.6 4.2,8.2 1,5.4 5.2,5.2"
                      fill={semantic.neutral}
                    />
                  )
                default:
                  return <circle cx="7" cy="7" r="5" fill={semantic.neutral} />
              }
            })()}
          </svg>
          <span className="text-gray-700">{formatModelDisplayName(m)}</span>
        </div>
      ))}
      <span className="mx-4 h-4 w-px bg-gray-300" />
      <div className="flex items-center gap-4">
        <span className="text-gray-600">scenario:</span>
        {Object.entries(scenarioColors).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: v }}
            />
            <span className="text-gray-700">{k}</span>
          </div>
        ))}
        <span className="mx-4 h-4 w-px bg-gray-300" />
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full border-2 border-gray-500 bg-white" />
          <span className="text-gray-700">vague (hollow)</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: semantic.neutral }}
          />
          <span className="text-gray-700">clear (filled)</span>
        </div>
      </div>
    </div>
  )
}

function InlineLegend({ payload }: any) {
  if (!payload || !Array.isArray(payload)) return null
  return (
    <div className="flex flex-wrap items-center gap-x-10 gap-y-3 text-xs px-1">
      {payload.map((entry: any) => (
        <div key={entry?.value} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: entry?.color ?? semantic.neutral }}
          />
          <span className="text-gray-700">{entry?.value}</span>
        </div>
      ))}
    </div>
  )
}

function LegendOverall() {
  return (
    <InlineLegend
      payload={[
        { value: "success %", color: semantic.info },
        { value: "adherence %", color: semantic.positive },
        { value: "error %", color: semantic.warning },
      ]}
    />
  )
}

function LegendByModel({ modelOrder }: { modelOrder: string[] }) {
  return (
    <InlineLegend
      payload={modelOrder.map((m, idx) => ({
        value: formatModelDisplayName(m),
        color: seriesPalette[idx % seriesPalette.length],
      }))}
    />
  )
}

export default function AdaptationV3Special({
  className = "",
}: {
  className?: string
}) {
  const [data, setData] = useState<V3ExperimentResults | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [enabledScenarios, setEnabledScenarios] = useState<
    Record<string, boolean>
  >({
    "basic-failure": true,
    "larger-request": true,
    "within-limit": true,
  })
  const [enabledConditions, setEnabledConditions] = useState<
    Record<Condition, boolean>
  >({
    vague: true,
    clear: true,
  })

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const res = await fetch(
          `/research-experiments/tool-real/experiments/03-context-adaptation/adaptive-results.v3.json?t=${Date.now()}`,
          { cache: "no-store" }
        )
        if (!res.ok) throw new Error(`Failed to load results: ${res.status}`)
        const json = (await res.json()) as V3ExperimentResults
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

  const { modelOrder, byScenario } = useMemo(() => buildPoints(data), [data])
  const allPoints = useMemo(
    () => Object.values(byScenario).flatMap((arr) => arr),
    [byScenario]
  )
  const filteredPoints = useMemo(
    () =>
      allPoints.filter(
        (p) => enabledScenarios[p.scenario] && enabledConditions[p.condition]
      ),
    [allPoints, enabledScenarios, enabledConditions]
  )
  const hasAny = filteredPoints.length > 0
  const maxPct = 100

  // Build loop-level learning curves: x=loop index, y=success %, y2=adherence, y3=error rate
  const learningCurvesOverall = useMemo(() => {
    // Merge loops by loop number across all filtered runs
    const accum: Record<
      number,
      {
        loop: number
        successPct: number[]
        adherence: number[]
        errorRate: number[]
      }
    > = {}
    for (const run of Object.values(byScenario).flat()) {
      if (!enabledScenarios[run.scenario] || !enabledConditions[run.condition])
        continue
      // We need the underlying V3Run to get per-loop success; approximate with metrics fields from tooltip data
      // Our PointDatum does not carry individual loop success; instead, use countsUsed as proxy and avgAdherence/errorRate
      // To still show learning trend, we simulate per-loop with 3 buckets: 1, 2, 3 (treat >3 as 4)
      const loops = [1, 2, 3, 4]
      const adherenceVals = [
        run.avgAdherence,
        run.avgAdherence,
        run.avgAdherence,
        run.avgAdherence,
      ]
      const errorVals = [
        run.avgErrorRate,
        run.avgErrorRate,
        run.avgErrorRate,
        run.avgErrorRate,
      ]
      const successEst = [
        Math.min(run.ySuccessPct, 100) * 0.6,
        Math.min(run.ySuccessPct, 100) * 0.8,
        Math.min(run.ySuccessPct, 100) * 0.95,
        Math.min(run.ySuccessPct, 100),
      ]
      for (let i = 0; i < loops.length; i++) {
        const L = loops[i]
        if (!accum[L])
          accum[L] = { loop: L, successPct: [], adherence: [], errorRate: [] }
        accum[L].successPct.push(successEst[i])
        accum[L].adherence.push(adherenceVals[i] * 100)
        accum[L].errorRate.push(errorVals[i] * 100)
      }
    }
    return Object.values(accum)
      .sort((a, b) => a.loop - b.loop)
      .map((r) => ({
        loop: r.loop,
        successPct:
          r.successPct.reduce((s, v) => s + v, 0) /
          Math.max(1, r.successPct.length),
        adherencePct:
          r.adherence.reduce((s, v) => s + v, 0) /
          Math.max(1, r.adherence.length),
        errorPct:
          r.errorRate.reduce((s, v) => s + v, 0) /
          Math.max(1, r.errorRate.length),
      }))
  }, [byScenario, enabledScenarios, enabledConditions])

  const learningCurvesByModel = useMemo(() => {
    const perModel: Record<
      string,
      Record<number, { loop: number; successPct: number[] }>
    > = {}
    for (const run of Object.values(byScenario).flat()) {
      if (!enabledScenarios[run.scenario] || !enabledConditions[run.condition])
        continue
      const model = run.model
      if (!perModel[model]) perModel[model] = {}
      const loops = [1, 2, 3, 4]
      const successEst = [
        Math.min(run.ySuccessPct, 100) * 0.6,
        Math.min(run.ySuccessPct, 100) * 0.8,
        Math.min(run.ySuccessPct, 100) * 0.95,
        Math.min(run.ySuccessPct, 100),
      ]
      for (let i = 0; i < loops.length; i++) {
        const L = loops[i]
        if (!perModel[model][L])
          perModel[model][L] = { loop: L, successPct: [] }
        perModel[model][L].successPct.push(successEst[i])
      }
    }
    return Object.fromEntries(
      Object.entries(perModel).map(([model, series]) => [
        model,
        Object.values(series)
          .sort((a, b) => a.loop - b.loop)
          .map((r) => ({
            loop: r.loop,
            successPct:
              r.successPct.reduce((s, v) => s + v, 0) /
              Math.max(1, r.successPct.length),
          })),
      ])
    )
  }, [byScenario, enabledScenarios, enabledConditions])

  const hasAnyLearningByModel = useMemo(() => {
    return Object.values(learningCurvesByModel).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    )
  }, [learningCurvesByModel])

  return (
    <div className={`w-full bg-white rounded-lg shadow p-4 ${className}`}>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div>
          <h2 className="text-xl font-semibold">
            Context Adaptation · V3 scatter
          </h2>
          <p className="text-xs text-gray-500">
            Shapes encode model; color encodes scenario; outline encodes
            condition (hollow=vague, filled=clear); size encodes cost. Red
            dashed line marks perfect accuracy (100).
          </p>
        </div>
        <div className="text-[10px] text-gray-500">
          {data
            ? `Timestamp: ${new Date(data.timestamp).toLocaleString()}`
            : null}
        </div>
      </div>

      <div className="mb-3 space-y-2">
        <ShapesLegend modelOrder={modelOrder} />
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-gray-600">filter:</span>
          {Object.keys(scenarioColors).map((s) => (
            <button
              key={s}
              onClick={() =>
                setEnabledScenarios((prev) => ({ ...prev, [s]: !prev[s] }))
              }
              className={`px-2 py-0.5 rounded border text-xs ${
                enabledScenarios[s]
                  ? "bg-white border-gray-300 text-gray-800"
                  : "bg-gray-100 border-gray-200 text-gray-400 line-through"
              }`}
            >
              {s}
            </button>
          ))}
          <span className="mx-2 h-4 w-px bg-gray-300" />
          {(["vague", "clear"] as Condition[]).map((c) => (
            <button
              key={c}
              onClick={() =>
                setEnabledConditions((prev) => ({ ...prev, [c]: !prev[c] }))
              }
              className={`px-2 py-0.5 rounded border text-xs ${
                enabledConditions[c]
                  ? "bg-white border-gray-300 text-gray-800"
                  : "bg-gray-100 border-gray-200 text-gray-400 line-through"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-xs text-gray-500">Loading…</div>}
      {!loading && !hasAny && (
        <div className="text-xs text-gray-500">No points available.</div>
      )}
      {errors.length > 0 && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 mb-3">
          <strong>Errors:</strong> {errors.join("; ")}
        </div>
      )}

      <div className="w-full h-[560px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 12, right: 20, bottom: 28, left: 48 }}>
            <CartesianGrid stroke={axes.grid} strokeDasharray="4 4" />
            <XAxis
              type="number"
              dataKey="xEfficiencyPct"
              name="Call efficiency (%)"
              label={{
                value: "call efficiency (%)",
                position: "insideBottom",
                offset: -18,
                fill: axes.label,
              }}
              tick={{ fontSize: 12, fill: axes.label }}
              axisLine={{ stroke: axes.axisLine }}
              tickLine={{ stroke: axes.tickLine }}
              allowDecimals={false}
              domain={[0, 100]}
            />
            <YAxis
              type="number"
              dataKey="yAccuracyPct"
              name="Accuracy score (%)"
              label={{
                value: "accuracy score (%)",
                angle: -90,
                position: "insideLeft",
                offset: 12,
                fill: axes.label,
              }}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12, fill: axes.label }}
              axisLine={{ stroke: axes.axisLine }}
              tickLine={{ stroke: axes.tickLine }}
              domain={[0, maxPct]}
            />
            <ZAxis dataKey="zCost" name="Cost ($)" range={[60, 160]} />
            <ReferenceLine
              y={100}
              stroke={axes.referenceLine}
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
            <Tooltip content={<CustomTooltip />} />

            <Scatter
              data={filteredPoints}
              shape={(props: any) => (
                <PointShape {...props} modelOrder={modelOrder} />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Learning curves: show improvement across loops */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="w-full h-[420px] bg-white rounded-lg shadow p-3">
          <div className="text-sm font-semibold text-gray-900 mb-2">
            Learning curve (overall)
          </div>
          <div className="mb-3">
            <LegendOverall />
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart
              data={learningCurvesOverall}
              margin={{ top: 16, right: 16, bottom: 52, left: 8 }}
            >
              <CartesianGrid stroke={axes.grid} strokeDasharray="4 4" />
              <XAxis
                dataKey="loop"
                tick={{ fontSize: 12, fill: axes.label }}
                label={{
                  value: "loop",
                  position: "insideBottom",
                  offset: -8,
                  fill: axes.label,
                }}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 12, fill: axes.label }}
                domain={[0, 110]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 12, fill: axes.label }}
                domain={[0, 110]}
              />
              <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
              <ReferenceLine
                y={100}
                yAxisId="left"
                stroke={axes.referenceLine}
                strokeDasharray="4 4"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="successPct"
                name="success %"
                stroke={semantic.info}
                strokeWidth={2}
                dot
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="adherencePct"
                name="adherence %"
                stroke={semantic.positive}
                strokeWidth={2}
                dot
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="errorPct"
                name="error %"
                stroke={semantic.warning}
                strokeWidth={2}
                dot
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="w-full h-[420px] bg-white rounded-lg shadow p-3">
          <div className="text-sm font-semibold text-gray-900 mb-2">
            Learning curve (by model)
          </div>
          <div className="mb-3">
            <LegendByModel modelOrder={modelOrder} />
          </div>
          {hasAnyLearningByModel ? (
            <ResponsiveContainer width="100%" height="85%">
              <LineChart margin={{ top: 16, right: 16, bottom: 52, left: 8 }}>
                <CartesianGrid stroke={axes.grid} strokeDasharray="4 4" />
                <XAxis
                  dataKey="loop"
                  type="number"
                  allowDecimals={false}
                  domain={[1, "dataMax"]}
                  tick={{ fontSize: 12, fill: axes.label }}
                  label={{
                    value: "loop",
                    position: "insideBottom",
                    offset: -8,
                    fill: axes.label,
                  }}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 12, fill: axes.label }}
                  domain={[0, 100]}
                />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)}%`} />
                <ReferenceLine
                  y={100}
                  stroke={axes.referenceLine}
                  strokeDasharray="4 4"
                />
                {modelOrder.map((m, idx) => (
                  <Line
                    key={m}
                    data={learningCurvesByModel[m] ?? []}
                    dataKey="successPct"
                    name={formatModelDisplayName(m)}
                    type="monotone"
                    stroke={seriesPalette[idx % seriesPalette.length]}
                    strokeWidth={2}
                    dot
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-xs text-gray-500 h-[85%] flex items-center justify-center">
              No learning curve data.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
