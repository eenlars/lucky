/**
 * analyzeV3vsBaseline.ts - Score baseline vs v3 using scoreRun and emit structured JSON
 */
import { readdirSync, readFileSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
import { groupAndAggregate, scoreMany, type ScoredRun } from "./scoreRun"

function analyze() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const basePath = join(__dirname, "results")

  const latestByPrefix = (prefix: string) => {
    const files = readdirSync(basePath)
      .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
      .sort()
    if (files.length === 0) throw new Error(`No files with prefix ${prefix}`)
    const latest = files[files.length - 1]
    return {
      path: join(basePath, latest),
      json: JSON.parse(readFileSync(join(basePath, latest), "utf-8")),
    }
  }

  const baseline = latestByPrefix("adaptive-results-")
  const v3 = latestByPrefix("adaptive-results.v3-")

  // Support { runs } or { results }
  const baselineRuns = Array.isArray(baseline.json?.runs)
    ? baseline.json.runs
    : Array.isArray(baseline.json?.results)
      ? baseline.json.results
      : []
  const v3Runs = Array.isArray(v3.json?.runs) ? v3.json.runs : []

  // Intersect by model and scenario to make apples-to-apples comparisons
  const keyMS = (r: any) => `${r.model}::${r.scenario}`
  const baselineKeys = new Set(baselineRuns.map(keyMS))
  const v3Keys = new Set(v3Runs.map(keyMS))
  const intersect = new Set(
    Array.from(baselineKeys).filter((k) => v3Keys.has(k))
  )
  const bFiltered = baselineRuns.filter((r: any) => intersect.has(keyMS(r)))
  const vFiltered = v3Runs.filter((r: any) => intersect.has(keyMS(r)))

  const baselineScores = scoreMany(bFiltered as any, "baseline")
  const v3Scores = scoreMany(vFiltered as any, "v3")
  const allScores: ScoredRun[] = [...baselineScores, ...v3Scores]

  // Helper to compare aggregates for a key across run kinds
  const compareBy = <K extends keyof ScoredRun>(
    key: K,
    excludeWithinLimitForAdaptation = false
  ) => {
    const filt = (s: ScoredRun) =>
      excludeWithinLimitForAdaptation ? s.scenario !== "within-limit" : true
    const bAgg = groupAndAggregate(baselineScores.filter(filt), key)
    const vAgg = groupAndAggregate(v3Scores.filter(filt), key)
    const toMap = (arr: any[]) => new Map(arr.map((r) => [r.key, r]))
    const bm = toMap(bAgg)
    const vm = toMap(vAgg)
    const keys = Array.from(new Set([...bm.keys(), ...vm.keys()]))
    return keys.map((k) => ({
      key: k,
      baseline: bm.get(k) || null,
      v3: vm.get(k) || null,
      deltas:
        bm.get(k) && vm.get(k)
          ? {
              adaptedRatePct:
                (vm.get(k).adaptedRatePct ?? 0) -
                (bm.get(k).adaptedRatePct ?? 0),
              avgSuccessPct:
                (vm.get(k).avgSuccessPct ?? 0) - (bm.get(k).avgSuccessPct ?? 0),
              avgCostUsd:
                (vm.get(k).avgCostUsd ?? 0) - (bm.get(k).avgCostUsd ?? 0),
              avgDurationMs:
                (vm.get(k).avgDurationMs ?? 0) - (bm.get(k).avgDurationMs ?? 0),
              avgAdherencePct:
                (vm.get(k).avgAdherencePct ?? 0) -
                (bm.get(k).avgAdherencePct ?? 0),
              avgErrorPct:
                (vm.get(k).avgErrorPct ?? 0) - (bm.get(k).avgErrorPct ?? 0),
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
  const outPath = join(basePath, `scores.v3_vs_baseline-${hh}${mm}.json`)
  const payload = {
    timestamp: new Date().toISOString(),
    files: { baseline: baseline.path, v3: v3.path },
    counts: { baseline: baselineScores.length, v3: v3Scores.length },
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
      v3: v3Scores,
    },
  }
  writeFileSync(outPath, JSON.stringify(payload, null, 2))
  console.log(`Saved JSON: ${outPath}`)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  analyze()
}
