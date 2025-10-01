/**
 * select-best-adaptive.ts
 *
 * Finds the best configuration across our multi-loop system (our-algorithm) and GPT-5,
 * optimizing for highest accuracy and lowest cost + time.
 *
 * Run:
 *   bun app/scripts/select-best-adaptive.ts
 */

import { promises as fs } from "fs"
import path from "path"

type Condition = "vague" | "clear"

type LoopMetrics = {
  adherenceToLimit: number
  totalItemsFetched: number
  requested: number
  errorRate: number
}

type Loop = { loop: number; metrics: LoopMetrics }
type Run = {
  model: string
  scenario: string
  condition: Condition
  successItems?: number
  cost?: number
  durationMs?: number
  loops?: Loop[]
}

type Results = { runs: Run[] }

function accuracyPct(items: number, requested: number): number {
  if (!requested || !isFinite(requested)) return 0
  return items >= requested ? 100 : (items / requested) * 100
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0
}

function to1(n: number): number {
  return Number(n.toFixed(1))
}

function eligible(run: Run): boolean {
  return run.scenario !== "within-limit"
}

function summarizeGroup(label: string, runs: Run[]) {
  const rs = runs.filter(eligible)
  const firstAcc: number[] = []
  const finalAcc: number[] = []
  const costs: number[] = []
  const times: number[] = []

  for (const r of rs) {
    const loops = r.loops ?? []
    const first = loops[0]
    const last = loops[loops.length - 1]
    const requested = first?.metrics?.requested ?? 0
    if (first) firstAcc.push(accuracyPct(first.metrics.totalItemsFetched ?? 0, requested))
    if (requested > 0) {
      const items =
        typeof r.successItems === "number" && isFinite(r.successItems)
          ? r.successItems
          : (last?.metrics?.totalItemsFetched ?? 0)
      finalAcc.push(accuracyPct(items, requested))
      const cost = typeof r.cost === "number" && isFinite(r.cost) ? r.cost : 0
      const dur = typeof r.durationMs === "number" && isFinite(r.durationMs) ? r.durationMs : 0
      costs.push(cost)
      times.push(dur)
    }
  }

  return {
    label,
    n: rs.length,
    firstAcc: to1(avg(firstAcc)),
    finalAcc: to1(avg(finalAcc)),
    avgCostUsd: Number(avg(costs).toFixed(4)),
    avgDurationMs: Math.round(avg(times)),
  }
}

async function main() {
  const cwd = process.cwd()
  const ourAlgorithmPath = path.resolve(
    cwd,
    "app/public/research-experiments/tool-real/experiments/03-context-adaptation/adaptive-results.our-algorithm.json",
  )
  const g5Path = path.resolve(
    cwd,
    "app/public/research-experiments/tool-real/experiments/03-context-adaptation/gpt5.json",
  )

  const ourAlgorithm = JSON.parse(await fs.readFile(ourAlgorithmPath, "utf-8")) as Results
  const g5 = JSON.parse(await fs.readFile(g5Path, "utf-8")) as Results

  // Group our-algorithm by model
  const map = new Map<string, Run[]>()
  for (const r of ourAlgorithm.runs) {
    const key = `our-algorithm:${r.model}`
    const arr = map.get(key)
    if (arr) arr.push(r)
    else map.set(key, [r])
  }
  // GPT-5 group
  map.set("gpt5:openai/gpt-5", g5.runs)

  const rows = [...map.entries()].map(([label, runs]) => summarizeGroup(label, runs))

  // Sort: highest finalAcc, then lowest avgCostUsd, then lowest avgDurationMs
  rows.sort((a, b) => {
    if (b.finalAcc !== a.finalAcc) return b.finalAcc - a.finalAcc
    if (a.avgCostUsd !== b.avgCostUsd) return a.avgCostUsd - b.avgCostUsd
    return a.avgDurationMs - b.avgDurationMs
  })

  console.log("\nTop configurations (by accuracy desc, cost asc, time asc):\n")
  console.table(rows.slice(0, 5))

  const best = rows[0]
  const [system, model] = best.label.split(":")

  const lines: string[] = []
  lines.push(
    `Best overall: ${system === "our-algorithm" ? "our multi-loop" : "GPT-5"} with ${model} — accuracy ${best.finalAcc}%, cost $${best.avgCostUsd}, time ${best.avgDurationMs} ms (N=${best.n}, within-limit excluded).`,
  )
  lines.push(
    `Next best candidates: ${rows
      .slice(1, 3)
      .map(r => `${r.label} (${r.finalAcc}%, $${r.avgCostUsd}, ${r.avgDurationMs} ms)`)
      .join("; ")}.`,
  )

  console.log("\nParagraph:\n")
  console.log(lines.join(" "))
  console.log("\n(From:\n  our-algorithm:", ourAlgorithmPath, "\n  gpt-5:", g5Path, ")\n")
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
