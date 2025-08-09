/**
 * runAdaptiveTest.ts - Baseline single-loop quick test (debug) outputting V3-compatible type
 */
import { mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

import { adaptiveTools } from "../../../shared/tools/adaptive/adaptiveTools"
import { runSequentialTools } from "../../02-sequential-chains/sequentialRunner"
import { scoreLoop } from "../analyze/scoreRun"
import {
  CLEAR_SYSTEM_PROMPT as CLEAR,
  MODELS,
  TEST_SCENARIOS as SCENARIOS,
  VAGUE_SYSTEM_PROMPT as VAGUE,
} from "../constants"
import type {
  Condition,
  LoopMetrics,
  V3ExperimentResults,
  V3Loop,
  V3Run,
} from "../types"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPEATS = 2
const CONCURRENCY = 20

// Baseline runner – perform N repeats (no memory), aggregate averages
async function runBaselineSingleLoop() {
  const resultsDir = join(__dirname, "results")
  mkdirSync(resultsDir, { recursive: true })

  // Build all repeat tasks across all combinations
  type RepeatResult = {
    model: V3Run["model"]
    scenarioId: string
    condition: Condition
    durationMs: number
    cost: number
    metrics: LoopMetrics
    expected: number
  }

  const taskFactories: Array<() => Promise<RepeatResult>> = []
  for (const model of MODELS) {
    for (const scenario of SCENARIOS) {
      for (const cond of ["vague", "clear"] as const) {
        const sys = cond === "vague" ? VAGUE : CLEAR
        for (let rep = 1; rep <= REPEATS; rep++) {
          console.log(`Running ${model} ${scenario.id} ${cond} ${rep}`)
          taskFactories.push(async (): Promise<RepeatResult> => {
            const t0 = Date.now()
            const res = await withQuietLogs(() =>
              runSequentialTools(model, scenario.prompt, adaptiveTools, sys)
            )
            const durationMs = Date.now() - t0
            const metrics: LoopMetrics = scoreLoop(
              res.toolExecutions,
              scenario.expected
            )
            return {
              model,
              scenarioId: scenario.id,
              condition: cond,
              durationMs,
              cost: res.totalCostUsd ?? 0,
              metrics,
              expected: scenario.expected,
            }
          })
        }
      }
    }
  }

  // Concurrency pool
  async function runPool<T>(
    factories: Array<() => Promise<T>>,
    limit: number
  ): Promise<T[]> {
    const results: T[] = []
    let next = 0
    const worker = async () => {
      while (true) {
        const current = next++
        if (current >= factories.length) break
        results[current] = await factories[current]()
      }
    }
    const workers = Array.from(
      { length: Math.min(limit, factories.length) },
      () => worker()
    )
    await Promise.all(workers)
    return results
  }

  const results = await runPool(taskFactories, CONCURRENCY)

  // Group results and aggregate per (model, scenario, condition)
  const grouped = new Map<string, RepeatResult[]>()
  for (const r of results) {
    const key = `${r.model}|${r.scenarioId}|${r.condition}`
    const arr = grouped.get(key)
    if (arr) arr.push(r)
    else grouped.set(key, [r])
  }

  const runs: V3Run[] = []
  for (const [key, group] of grouped.entries()) {
    const [modelKey, scenarioId, condition] = key.split("|") as [
      string,
      string,
      Condition,
    ]
    const model = modelKey as V3Run["model"]
    const repeatMetrics = group.map((g) => g.metrics)
    const repeatCosts = group.map((g) => g.cost)
    const repeatDurations = group.map((g) => g.durationMs)
    const expected = group[0]?.expected ?? 0 // TODO: fix this

    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0
    const pickMajorityStrategy = (): LoopMetrics["strategy"] => {
      const counts: Record<string, number> = {}
      for (const m of repeatMetrics)
        counts[m.strategy] = (counts[m.strategy] || 0) + 1
      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1])
      return (entries[0]?.[0] as LoopMetrics["strategy"]) || "no-success"
    }

    // Build a single aggregated "repeat" as a loop for compatibility
    const aggregatedLoop: V3Loop = {
      loop: 1,
      success: avg(repeatMetrics.map((m) => (m.adapted ? 1 : 0))) >= 0.5,
      cost: avg(repeatCosts),
      durationMs: avg(repeatDurations),
      updatedMemory: null,
      learnings: null,
      toolExecutions: [],
      metrics: {
        fetchCallsCount: avg(repeatMetrics.map((m) => m.fetchCallsCount)),
        combineCallsCount: avg(repeatMetrics.map((m) => m.combineCallsCount)),
        firstCallFailed: repeatMetrics.some((m) => m.firstCallFailed),
        countsUsed: {
          "1": avg(repeatMetrics.map((m) => m.countsUsed["1"])),
          "2": avg(repeatMetrics.map((m) => m.countsUsed["2"])),
          "3": avg(repeatMetrics.map((m) => m.countsUsed["3"])),
          gt3: avg(repeatMetrics.map((m) => m.countsUsed.gt3)),
        },
        adherenceToLimit: avg(repeatMetrics.map((m) => m.adherenceToLimit)),
        totalItemsFetched: avg(repeatMetrics.map((m) => m.totalItemsFetched)),
        requested: expected,
        adapted: avg(repeatMetrics.map((m) => (m.adapted ? 1 : 0))) >= 0.5,
        errorRate: avg(repeatMetrics.map((m) => m.errorRate)),
        strategy: pickMajorityStrategy(),
      },
    }

    const successItemsAvg = aggregatedLoop.metrics.totalItemsFetched
    const totalFetchCallsAvg = aggregatedLoop.metrics.fetchCallsCount
    const adapted = successItemsAvg >= expected

    runs.push({
      model,
      scenario: scenarioId,
      condition,
      adapted,
      totalFetchCalls: totalFetchCallsAvg,
      successItems: successItemsAvg,
      success: aggregatedLoop.success,
      cost: aggregatedLoop.cost || 0,
      durationMs: aggregatedLoop.durationMs || 0,
      loops: [aggregatedLoop],
      learningEffects: null,
    })

    console.log(
      `${model} ${scenarioId} ${condition}: calls≈${totalFetchCallsAvg.toFixed(2)}, items≈${successItemsAvg.toFixed(2)}/${expected}, adapted=${adapted}, cost≈${(aggregatedLoop.cost ?? 0).toFixed(2)}`
    )
  }

  const now = new Date()
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  const out = join(resultsDir, `adaptive-results-${hh}${mm}.json`)
  const payload: V3ExperimentResults = {
    timestamp: new Date().toISOString(),
    runs,
  }
  writeFileSync(out, JSON.stringify(payload, null, 2))
  console.log(`Saved: ${out}`)
}

// Quiet noisy internal logs
function withQuietLogs<T>(fn: () => Promise<T> | T): Promise<T> | T {
  const originalLog = console.log
  const originalError = console.error
  try {
    console.log = (...args: any[]) => {
      const text = args.map(String).join(" ")
      if (
        text.includes("decision:") ||
        text.includes("[InvocationPipeline]") ||
        text.includes("save msg failed")
      ) {
        return
      }
      originalLog(...args)
    }
    console.error = (...args: any[]) => {
      const text = args.map(String).join(" ")
      if (text.includes("save msg failed")) return
      originalError(...args)
    }
    return fn()
  } finally {
    console.log = originalLog
    console.error = originalError
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBaselineSingleLoop().catch(console.error)
}
