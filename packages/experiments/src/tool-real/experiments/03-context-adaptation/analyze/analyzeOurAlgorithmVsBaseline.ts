/**
 * analyzeOurAlgorithmVsBaseline.ts - Score baseline vs our-algorithm using scoreRun and emit structured JSON
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { type ScoredRun, groupAndAggregate, scoreMany } from "./scoreRun"

function analyze() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const basePath = join(__dirname, "results")

  const latestByPrefix = (prefix: string) => {
    const files = readdirSync(basePath)
      .filter(f => f.startsWith(prefix) && f.endsWith(".json"))
      .sort()
    if (files.length === 0) throw new Error(`No files with prefix ${prefix}`)
    const latest = files[files.length - 1]
    return {
      path: join(basePath, latest),
      json: JSON.parse(readFileSync(join(basePath, latest), "utf-8")),
    }
  }

  const baseline = latestByPrefix("adaptive-results-")
  const ourAlgorithm = latestByPrefix("adaptive-results.our-algorithm-")

  // Support { runs } or { results }
  const baselineRuns = Array.isArray(baseline.json?.runs)
    ? baseline.json.runs
    : Array.isArray(baseline.json?.results)
      ? baseline.json.results
      : []
  const ourAlgorithmRuns = Array.isArray(ourAlgorithm.json?.runs) ? ourAlgorithm.json.runs : []

  // Intersect by model and scenario to make apples-to-apples comparisons
  const keyMS = (r: any) => `${r.model}::${r.scenario}`
  const baselineKeys = new Set(baselineRuns.map(keyMS))
  const ourAlgorithmKeys = new Set(ourAlgorithmRuns.map(keyMS))
  const intersect = new Set(Array.from(baselineKeys).filter(k => ourAlgorithmKeys.has(k)))
  const bFiltered = baselineRuns.filter((r: any) => intersect.has(keyMS(r)))
  const vFiltered = ourAlgorithmRuns.filter((r: any) => intersect.has(keyMS(r)))

  const baselineScores = scoreMany(bFiltered as any, "baseline")
  const ourAlgorithmScores = scoreMany(vFiltered as any, "our-algorithm")
  const allScores: ScoredRun[] = [...baselineScores, ...ourAlgorithmScores]

  // Helper to compare aggregates for a key across run kinds
  const compareBy = <K extends keyof ScoredRun>(key: K, excludeWithinLimitForAdaptation = false) => {
    const filt = (s: ScoredRun) => (excludeWithinLimitForAdaptation ? s.scenario !== "within-limit" : true)
    const bAgg = groupAndAggregate(baselineScores.filter(filt), key)
    const vAgg = groupAndAggregate(ourAlgorithmScores.filter(filt), key)
    const toMap = (arr: any[]) => new Map(arr.map(r => [r.key, r]))
    const bm = toMap(bAgg)
    const vm = toMap(vAgg)
    const keys = Array.from(new Set([...bm.keys(), ...vm.keys()]))
    return keys.map(k => ({
      key: k,
      baseline: bm.get(k) || null,
      ourAlgorithm: vm.get(k) || null,
      deltas:
        bm.get(k) && vm.get(k)
          ? {
              adaptedRatePct: (vm.get(k).adaptedRatePct ?? 0) - (bm.get(k).adaptedRatePct ?? 0),
              avgSuccessPct: (vm.get(k).avgSuccessPct ?? 0) - (bm.get(k).avgSuccessPct ?? 0),
              avgCostUsd: (vm.get(k).avgCostUsd ?? 0) - (bm.get(k).avgCostUsd ?? 0),
              avgDurationMs: (vm.get(k).avgDurationMs ?? 0) - (bm.get(k).avgDurationMs ?? 0),
              avgAdherencePct: (vm.get(k).avgAdherencePct ?? 0) - (bm.get(k).avgAdherencePct ?? 0),
              avgErrorPct: (vm.get(k).avgErrorPct ?? 0) - (bm.get(k).avgErrorPct ?? 0),
            }
          : null,
    }))
  }

  // Overall aggregates
  const byRunKind = groupAndAggregate(allScores, "runKind")
  const byCondition = compareBy("condition", true)
  const byModel = compareBy("model")
  const byScenario = compareBy("scenario")

  const now = new Date()
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  const outPath = join(basePath, `scores.our-algorithm_vs_baseline-${hh}${mm}.json`)
  const payload = {
    timestamp: new Date().toISOString(),
    files: { baseline: baseline.path, ourAlgorithm: ourAlgorithm.path },
    counts: {
      baseline: baselineScores.length,
      ourAlgorithm: ourAlgorithmScores.length,
    },
    intersection: {
      models: Array.from(new Set(bFiltered.map((r: any) => r.model))),
      scenarios: Array.from(new Set(bFiltered.map((r: any) => r.scenario))),
    },
    aggregates: {
      byRunKind,
      byCondition,
      byModel,
      byScenario,
    },
    scores: {
      baseline: baselineScores,
      ourAlgorithm: ourAlgorithmScores,
    },
  }
  writeFileSync(outPath, JSON.stringify(payload, null, 2))
  console.log(`Saved JSON: ${outPath}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  analyze()
}
