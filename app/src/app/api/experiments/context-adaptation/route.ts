import {
  ADAPTIVE_RESULTS_URL,
  getLatestFileByPrefixes,
  loadJsonProdOrLocal,
} from "@/lib/experiments/file-utils"
import type { Condition } from "@experiments/tool-real/experiments/03-context-adaptation/types"
import { promises as fs } from "fs"
import { NextResponse } from "next/server"
import path from "path"

type BaselineResult = {
  model: string
  scenario: string
  condition: Condition
  success?: boolean
  adaptiveBehavior: { successfulStrategy: boolean }
}

type V3Run = {
  model: string
  scenario: string
  condition: Condition
  adapted?: boolean
  success?: boolean
  cost?: number
  durationMs?: number
  totalFetchCalls?: number
  successItems?: number
}

async function getLatestByPrefix(baseDir: string, prefixes: string[]) {
  return getLatestFileByPrefixes(baseDir, prefixes)
}

async function _getLatestBaselinePath(baseDir: string) {
  try {
    const entries = await fs.readdir(baseDir)
    const candidates = entries
      .filter(
        (f) =>
          f.startsWith("adaptive-results") &&
          !f.startsWith("adaptive-results.v3")
      )
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(baseDir, f))
    if (candidates.length === 0) {
      const exact = path.join(baseDir, "adaptive-results.json")
      try {
        await fs.access(exact)
        return exact
      } catch {
        console.error("No baseline file found in", baseDir)
        return null
      }
    }
    const stats = await Promise.all(
      candidates.map(async (p) => {
        try {
          const s = await fs.stat(p)
          return { filePath: p, mtimeMs: s.mtimeMs }
        } catch {
          return { filePath: p, mtimeMs: 0 }
        }
      })
    )
    stats.sort((a, b) => b.mtimeMs - a.mtimeMs)
    return stats[0]?.filePath ?? null
  } catch {
    return null
  }
}

function aggregateBaselineResults(results: BaselineResult[]) {
  const byModel: Record<
    string,
    { vSucc: number; vTot: number; cSucc: number; cTot: number }
  > = {}
  for (const r of results) {
    if (r.scenario === "within-limit") continue
    if (!byModel[r.model])
      byModel[r.model] = { vSucc: 0, vTot: 0, cSucc: 0, cTot: 0 }
    if (r.condition === "vague") {
      byModel[r.model].vTot += 1
      if (r.success || r.adaptiveBehavior?.successfulStrategy)
        byModel[r.model].vSucc += 1
    } else {
      byModel[r.model].cTot += 1
      if (r.success || r.adaptiveBehavior?.successfulStrategy)
        byModel[r.model].cSucc += 1
    }
  }
  const chartData = Object.entries(byModel).map(([model, v]) => ({
    model,
    vague: v.vTot ? Number(((v.vSucc / v.vTot) * 100).toFixed(1)) : 0,
    clear: v.cTot ? Number(((v.cSucc / v.cTot) * 100).toFixed(1)) : 0,
  }))
  return chartData
}

function aggregateV3Runs(runs: V3Run[]) {
  const byModel: Record<
    string,
    { vSucc: number; vTot: number; cSucc: number; cTot: number }
  > = {}
  for (const r of runs) {
    if (r.scenario === "within-limit") continue
    if (!byModel[r.model])
      byModel[r.model] = { vSucc: 0, vTot: 0, cSucc: 0, cTot: 0 }
    if (r.condition === "vague") {
      byModel[r.model].vTot += 1
      if (r.adapted || r.success) byModel[r.model].vSucc += 1
    } else {
      byModel[r.model].cTot += 1
      if (r.adapted || r.success) byModel[r.model].cSucc += 1
    }
  }
  const chartData = Object.entries(byModel).map(([model, v]) => ({
    model,
    vague: v.vTot ? Number(((v.vSucc / v.vTot) * 100).toFixed(1)) : 0,
    clear: v.cTot ? Number(((v.cSucc / v.cTot) * 100).toFixed(1)) : 0,
  }))
  return chartData
}

function _aggregateFinalFromRuns(
  runs: Array<{
    model: string
    condition: Condition
    adapted?: boolean
  }>
) {
  const byModel: Record<
    string,
    { vSucc: number; vTot: number; cSucc: number; cTot: number }
  > = {}
  for (const r of runs) {
    if (!byModel[r.model])
      byModel[r.model] = { vSucc: 0, vTot: 0, cSucc: 0, cTot: 0 }
    if (r.condition === "vague") {
      byModel[r.model].vTot += 1
      if (r.adapted) byModel[r.model].vSucc += 1
    } else {
      byModel[r.model].cTot += 1
      if (r.adapted) byModel[r.model].cSucc += 1
    }
  }
  return Object.entries(byModel).map(([model, v]) => ({
    model,
    vague: v.vTot ? Number(((v.vSucc / v.vTot) * 100).toFixed(1)) : 0,
    clear: v.cTot ? Number(((v.cSucc / v.cTot) * 100).toFixed(1)) : 0,
  }))
}

type MetricsRow = {
  model: string
  vagueMs?: number
  clearMs?: number
  vagueCost?: number
  clearCost?: number
  vagueCalls?: number
  clearCalls?: number
  vagueItems?: number
  clearItems?: number
  vagueMsPerItem?: number
  clearMsPerItem?: number
  vagueCostPerItem?: number
  clearCostPerItem?: number
}

function aggregateTimeAndCostFromRuns(runs: V3Run[]): MetricsRow[] {
  const byModel: Record<
    string,
    {
      vague: {
        msTotal: number
        costTotal: number
        callsTotal: number
        itemsTotal: number
        count: number
      }
      clear: {
        msTotal: number
        costTotal: number
        callsTotal: number
        itemsTotal: number
        count: number
      }
    }
  > = {}

  for (const r of runs) {
    const modelBucket =
      byModel[r.model] ??
      (byModel[r.model] = {
        vague: {
          msTotal: 0,
          costTotal: 0,
          callsTotal: 0,
          itemsTotal: 0,
          count: 0,
        },
        clear: {
          msTotal: 0,
          costTotal: 0,
          callsTotal: 0,
          itemsTotal: 0,
          count: 0,
        },
      })
    const target =
      r.condition === "vague" ? modelBucket.vague : modelBucket.clear
    if (typeof r.durationMs === "number" && isFinite(r.durationMs)) {
      target.msTotal += r.durationMs
    }
    if (typeof r.cost === "number" && isFinite(r.cost)) {
      target.costTotal += r.cost
    }
    if (typeof r.totalFetchCalls === "number" && isFinite(r.totalFetchCalls)) {
      target.callsTotal += r.totalFetchCalls
    }
    if (typeof r.successItems === "number" && isFinite(r.successItems)) {
      target.itemsTotal += r.successItems
    }
    target.count += 1
  }

  return Object.entries(byModel).map(([model, v]) => ({
    model,
    vagueMs: v.vague.count
      ? Number((v.vague.msTotal / v.vague.count).toFixed(1))
      : undefined,
    clearMs: v.clear.count
      ? Number((v.clear.msTotal / v.clear.count).toFixed(1))
      : undefined,
    vagueCost: v.vague.count
      ? Number((v.vague.costTotal / v.vague.count).toFixed(6))
      : undefined,
    clearCost: v.clear.count
      ? Number((v.clear.costTotal / v.clear.count).toFixed(6))
      : undefined,
    vagueCalls: v.vague.count
      ? Number((v.vague.callsTotal / v.vague.count).toFixed(2))
      : undefined,
    clearCalls: v.clear.count
      ? Number((v.clear.callsTotal / v.clear.count).toFixed(2))
      : undefined,
    vagueItems: v.vague.count
      ? Number((v.vague.itemsTotal / v.vague.count).toFixed(2))
      : undefined,
    clearItems: v.clear.count
      ? Number((v.clear.itemsTotal / v.clear.count).toFixed(2))
      : undefined,
    vagueMsPerItem:
      v.vague.itemsTotal > 0
        ? Number((v.vague.msTotal / v.vague.itemsTotal).toFixed(1))
        : undefined,
    clearMsPerItem:
      v.clear.itemsTotal > 0
        ? Number((v.clear.msTotal / v.clear.itemsTotal).toFixed(1))
        : undefined,
    vagueCostPerItem:
      v.vague.itemsTotal > 0
        ? Number((v.vague.costTotal / v.vague.itemsTotal).toFixed(6))
        : undefined,
    clearCostPerItem:
      v.clear.itemsTotal > 0
        ? Number((v.clear.costTotal / v.clear.itemsTotal).toFixed(6))
        : undefined,
  }))
}

export async function GET() {
  try {
    const resultsDir = path.resolve(
      process.cwd(),
      "public/research-experiments/tool-real/experiments/03-context-adaptation"
    )
    const PROD_BASELINE_URL = ADAPTIVE_RESULTS_URL

    // Collect all datasets: final, baseline, v3
    const files: { final?: string; baseline?: string; v3?: string } = {}
    const errors: string[] = []
    const info: string[] = []
    const finalChart: Array<{ model: string; vague: number; clear: number }> =
      []
    let baselineChart: Array<{ model: string; vague: number; clear: number }> =
      []
    let v3Chart: Array<{ model: string; vague: number; clear: number }> = []
    let metricsChart: MetricsRow[] = []

    // // Final validation (if present)
    // const finalPath = await getLatestByPrefix(resultsDir, [
    //   "final-adaptive-validation-results",
    // ])
    // if (finalPath) {
    //   try {
    //     const raw = await fs.readFile(finalPath, "utf-8")
    //     const json = JSON.parse(raw) as any
    //     const analysis = Array.isArray(json?.analysis) ? json.analysis : []
    //     if (analysis.length) {
    //       finalChart = analysis.map((a: any) => ({
    //         model: a.model,
    //         vague: Number(a.vagueSuccessRate),
    //         clear: Number(a.clearSuccessRate),
    //       }))
    //       files.final = finalPath
    //       info.push(`final: models=${finalChart.length}`)
    //     } else if (Array.isArray(json?.runs)) {
    //       finalChart = aggregateFinalFromRuns(json.runs)
    //       if (finalChart.length) files.final = finalPath
    //       info.push(
    //         `final: runs=${json.runs.length}, models=${finalChart.length}`
    //       )
    //       if (!finalChart.length)
    //         info.push("Final file has runs but produced empty aggregation")
    //     } else {
    //       info.push("Final file parsed but found neither analysis nor runs")
    //     }
    //   } catch (e: any) {
    //     const msg = `Failed reading/parsing final file: ${finalPath}: ${e?.message ?? e}`
    //     errors.push(msg)
    //     console.error(msg)
    //   }
    // }

    // Baseline results — production from Supabase, dev from local public
    const baselinePath = path.resolve(
      process.cwd(),
      "public/research-experiments/tool-real/experiments/03-context-adaptation/adaptive-results.json"
    )

    const baselineLoad = await loadJsonProdOrLocal<any>(
      PROD_BASELINE_URL,
      baselinePath
    )
    if (baselineLoad.source !== "none") {
      files.baseline = baselineLoad.file ?? undefined
    }
    if (baselineLoad.error) {
      errors.push(`baseline: ${baselineLoad.error}`)
    }
    const baselineJson = baselineLoad.json
    if (baselineJson) {
      if (Array.isArray(baselineJson?.results)) {
        const results = baselineJson.results as BaselineResult[]
        baselineChart = aggregateBaselineResults(results)
        info.push(
          `baseline: results=${results.length}, models=${baselineChart.length}`
        )
      } else if (Array.isArray(baselineJson?.runs)) {
        const runs = baselineJson.runs as V3Run[]
        baselineChart = aggregateV3Runs(runs)
        metricsChart = aggregateTimeAndCostFromRuns(runs)
        info.push(
          `baseline (runs): runs=${runs.length}, models=${baselineChart.length}`
        )
      } else {
        info.push("Baseline parsed but found neither results nor runs")
      }
    }

    // V3 runs
    const v3Path = await getLatestByPrefix(resultsDir, ["adaptive-results.v3"])
    if (v3Path) {
      try {
        const raw = await fs.readFile(v3Path, "utf-8")
        const json = JSON.parse(raw) as { runs?: V3Run[] }
        const runs = json?.runs || []
        if (runs.length) {
          v3Chart = aggregateV3Runs(runs)
          files.v3 = v3Path
          info.push(`v3: runs=${runs.length}, models=${v3Chart.length}`)
        } else {
          info.push("V3 file parsed but contains no runs")
        }
      } catch (e: any) {
        const msg = `Failed reading/parsing v3 file: ${v3Path}: ${e?.message ?? e}`
        errors.push(msg)
        console.error(msg)
      }
    }

    // Always prefer baseline for the primary dataset
    let source: "final" | "baseline" | "v3" | "none" = "none"
    let chartData: Array<{ model: string; vague: number; clear: number }> = []
    if (baselineChart.length) {
      source = "baseline"
      chartData = baselineChart
    } else if (v3Chart.length) {
      source = "v3"
      chartData = v3Chart
    }

    if (source === "none") {
      return NextResponse.json(
        { ok: false, error: "No results found", files, errors, info },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      source,
      chartData,
      datasets: {
        final: finalChart,
        baseline: baselineChart,
        v3: v3Chart,
        metrics: metricsChart,
      },
      files,
      errors,
      info,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
