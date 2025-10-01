import type { OpenRouterModelName } from "@core/utils/spending/models.types"
import type { ToolExecution } from "../../02-sequential-chains/types"
import { TEST_SCENARIOS } from "../constants"
import type { Condition, LoopMetrics, OurAlgorithmLoop, OurAlgorithmRun } from "../types"

export type RunKind = "baseline" | "our-algorithm"

export interface ScoredRun {
  // identity
  model: OpenRouterModelName
  condition: Condition
  scenario: string
  runKind: RunKind

  // core performance
  adapted: boolean
  successItems: number
  requested: number
  successPct: number // successItems / requested * 100

  // efficiency (aggregated for our-algorithm across loops)
  costUsd: number
  durationMs: number

  // behavior metrics
  totalFetchCalls: number
  totalCombineCalls: number
  adherenceToLimitPct: number // 0-100
  errorRatePct: number // 0-100
  firstCallFailed: boolean

  // strategy snapshot from the last loop
  strategy: LoopMetrics["strategy"]
}

function getRequestedCount(scenarioId: string): number {
  const s = TEST_SCENARIOS.find(x => x.id === scenarioId)
  return s?.expected ?? 0
}

// Aggregate a list of loops into a single metrics rollup (sum cost/duration, last-loop strategy, average adherence/error)
function aggregateLoops(loops: OurAlgorithmLoop[]): {
  costUsd: number
  durationMs: number
  totalFetchCalls: number
  totalCombineCalls: number
  adherenceToLimit: number
  errorRate: number
  firstCallFailed: boolean
  strategy: LoopMetrics["strategy"]
} {
  if (!Array.isArray(loops) || loops.length === 0) {
    return {
      costUsd: 0,
      durationMs: 0,
      totalFetchCalls: 0,
      totalCombineCalls: 0,
      adherenceToLimit: 0,
      errorRate: 0,
      firstCallFailed: false,
      strategy: "no-success",
    }
  }

  const last = loops[loops.length - 1]
  const costUsd = loops.reduce((s, l) => s + (l.cost ?? 0), 0)
  const durationMs = loops.reduce((s, l) => s + (l.durationMs ?? 0), 0)
  const totalFetchCalls = loops.reduce((s, l) => s + (l.metrics.fetchCallsCount ?? 0), 0)
  const totalCombineCalls = loops.reduce((s, l) => s + (l.metrics.combineCallsCount ?? 0), 0)
  const adherenceToLimit = loops.reduce((s, l) => s + (l.metrics.adherenceToLimit ?? 0), 0) / loops.length
  const errorRate = loops.reduce((s, l) => s + (l.metrics.errorRate ?? 0), 0) / loops.length
  const firstCallFailed = !!loops[0]?.metrics.firstCallFailed
  const strategy = last.metrics.strategy

  return {
    costUsd,
    durationMs,
    totalFetchCalls,
    totalCombineCalls,
    adherenceToLimit,
    errorRate,
    firstCallFailed,
    strategy,
  }
}

/**
 * scoreRun - normalizes a OurAlgorithm-style run (baseline single loop or multi-loop our-algorithm) into comparable metrics
 *
 * - runKind: "baseline" uses only the single loop; "our-algorithm" aggregates across loops
 * - successPct computed against scenario expected value
 * - efficiency metrics are summed across loops for our-algorithm
 */
export function scoreRun(run: OurAlgorithmRun, runKind: RunKind): ScoredRun {
  const requested = getRequestedCount(run.scenario)
  const loops = run.loops ?? []
  const loopAgg = runKind === "our-algorithm" ? aggregateLoops(loops) : aggregateLoops(loops.slice(0, 1))

  const successItems = run.successItems ?? 0
  const successPct = requested ? (successItems / requested) * 100 : 0

  return {
    model: run.model,
    condition: run.condition,
    scenario: run.scenario,
    runKind,
    adapted: !!run.adapted,
    successItems,
    requested,
    successPct,
    costUsd: loopAgg.costUsd,
    durationMs: loopAgg.durationMs,
    totalFetchCalls: loopAgg.totalFetchCalls,
    totalCombineCalls: loopAgg.totalCombineCalls,
    adherenceToLimitPct: loopAgg.adherenceToLimit * 100,
    errorRatePct: loopAgg.errorRate * 100,
    firstCallFailed: loopAgg.firstCallFailed,
    strategy: loopAgg.strategy,
  }
}

/**
 * scoreMany - convenience helper to score a list of runs
 */
export function scoreMany(runs: OurAlgorithmRun[], runKind: RunKind): ScoredRun[] {
  return runs.map(r => scoreRun(r, runKind))
}

/**
 * groupAndAggregate - example aggregator that groups scores by key and returns averages.
 * Useful for comparing prompt types, models, or run kinds as in the Methodology doc.
 */
export function groupAndAggregate<T extends keyof ScoredRun>(scores: ScoredRun[], groupKey: T) {
  const buckets = new Map<any, ScoredRun[]>()
  for (const s of scores) {
    const k = s[groupKey]
    const arr = buckets.get(k) ?? []
    arr.push(s)
    buckets.set(k, arr)
  }
  return Array.from(buckets.entries()).map(([key, arr]) => ({
    key,
    n: arr.length,
    adaptedRatePct: (arr.filter(x => x.adapted).length / Math.max(1, arr.length)) * 100,
    avgSuccessPct: arr.reduce((sum, x) => sum + x.successPct, 0) / Math.max(1, arr.length),
    avgCostUsd: arr.reduce((sum, x) => sum + x.costUsd, 0) / Math.max(1, arr.length),
    avgDurationMs: arr.reduce((sum, x) => sum + x.durationMs, 0) / Math.max(1, arr.length),
    avgAdherencePct: arr.reduce((sum, x) => sum + x.adherenceToLimitPct, 0) / Math.max(1, arr.length),
    avgErrorPct: arr.reduce((sum, x) => sum + x.errorRatePct, 0) / Math.max(1, arr.length),
  }))
}

/**
 * scoreLoop - unified per-loop metrics extraction used by baseline and our-algorithm
 * If toolUsageOutputs is provided, errorRate is computed from it; otherwise it
 * is approximated from tool execution outputs.
 */
type ToolUsageEntry = {
  type: "error" | "info" | "debug" | string
  [k: string]: unknown
}

export function scoreLoop(execs: ToolExecution[], requested: number, toolUsageOutputs?: ToolUsageEntry[]): LoopMetrics {
  const isFetch = (e: ToolExecution) => (e as any).toolName === "fetch_objects"
  const isCombine = (e: ToolExecution) => (e as any).toolName === "combine_results"
  const fetches = execs.filter(isFetch)
  const combines = execs.filter(isCombine)

  const counts: LoopMetrics["countsUsed"] = { "1": 0, "2": 0, "3": 0, gt3: 0 }
  for (const f of fetches) {
    const c = Number(((f as any).inputData as any)?.count ?? 0)
    if (c >= 1 && c <= 3) {
      const key = String(c) as keyof LoopMetrics["countsUsed"]
      counts[key]++
    } else if (c > 3) {
      counts.gt3++
    }
  }

  const firstFetch = fetches[0] as any
  const firstCallFailed =
    !!firstFetch &&
    !Array.isArray(firstFetch?.outputData) &&
    !(typeof firstFetch?.outputData === "object" && firstFetch?.outputData !== null)

  const totalItemsFetched = fetches
    .filter((f: any) => Array.isArray(f.outputData))
    .reduce((n: number, f: any) => n + ((f.outputData as any[])?.length || 0), 0)

  const adapted = totalItemsFetched >= requested
  const fetchCallsCount = fetches.length
  const combineCallsCount = combines.length

  // error rate: prefer explicit toolUsageOutputs when available
  const errorRate =
    toolUsageOutputs && toolUsageOutputs.length
      ? toolUsageOutputs.filter(o => o?.type === "error").length / toolUsageOutputs.length
      : ((): number => {
          const totalToolUsages = execs.length
          const errorUsages = (execs as any[]).filter(
            e => typeof (e as any).outputData === "string" && String((e as any).outputData).startsWith("ERROR:"),
          ).length
          return totalToolUsages ? errorUsages / totalToolUsages : 0
        })()

  // strategy classification
  const minimalCalls = Math.ceil(requested / 3)
  const usedAllLE3 = counts.gt3 === 0
  const strategy: LoopMetrics["strategy"] =
    fetchCallsCount === 1
      ? "single-call"
      : usedAllLE3 && fetchCallsCount === minimalCalls
        ? "optimal-split"
        : fetchCallsCount >= 2
          ? "multi-call"
          : "no-success"

  return {
    fetchCallsCount,
    combineCallsCount,
    firstCallFailed,
    countsUsed: counts,
    adherenceToLimit: fetchCallsCount ? (counts["1"] + counts["2"] + counts["3"]) / fetchCallsCount : 0,
    totalItemsFetched,
    requested,
    adapted,
    errorRate,
    strategy,
  }
}
