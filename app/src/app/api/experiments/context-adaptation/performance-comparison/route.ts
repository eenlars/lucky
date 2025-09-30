import { promises as fs } from "fs"
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/api-auth"
import path from "path"

interface _RunResult {
  model: string
  scenario: string
  condition: "vague" | "clear"
  adapted?: boolean
  success?: boolean
  cost?: number
  durationMs?: number
  successItems?: number
  loops?: Array<{
    cost?: number
    durationMs?: number
    metrics?: {
      adapted?: boolean
    }
  }>
}

interface StatisticalResult {
  mean: number
  ci: [number, number]
  n: number
  std: number
}

interface ComparisonRow {
  method:
    | "Vague Prompt"
    | "Clear Prompt"
    | "This Paper (1 Run, Vague)"
    | "This Paper (1 Run, Clear)"
    | "This Paper (3 Runs, Vague)"
    | "This Paper (3 Runs, Clear)"
  model: string
  n: number
  adaptationRate: StatisticalResult
  avgCost: StatisticalResult
  avgDuration: StatisticalResult
  pValue: number | null
  effectSize: number | null
  significant: boolean
}

// Statistical utility functions
function bootstrap(data: number[], iterations = 1000): [number, number] {
  if (data.length === 0) return [0, 0]

  const means: number[] = []
  for (let i = 0; i < iterations; i++) {
    const sample = []
    for (let j = 0; j < data.length; j++) {
      const randomIndex = Math.floor(Math.random() * data.length)
      sample.push(data[randomIndex])
    }
    const mean = sample.reduce((sum, val) => sum + val, 0) / sample.length
    means.push(mean)
  }

  means.sort((a, b) => a - b)
  const lowerIndex = Math.floor(0.025 * means.length)
  const upperIndex = Math.floor(0.975 * means.length)

  return [means[lowerIndex], means[upperIndex]]
}

function tTest(group1: number[], group2: number[]): number | null {
  if (group1.length === 0 || group2.length === 0) return null

  const mean1 = group1.reduce((sum, val) => sum + val, 0) / group1.length
  const mean2 = group2.reduce((sum, val) => sum + val, 0) / group2.length

  const variance1 = group1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (group1.length - 1)
  const variance2 = group2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (group2.length - 1)

  if (variance1 === 0 && variance2 === 0) return null

  const pooledSE = Math.sqrt(variance1 / group1.length + variance2 / group2.length)
  if (pooledSE === 0) return null

  const tStat = Math.abs(mean1 - mean2) / pooledSE

  // Approximate p-value for t-distribution (simplified)
  if (tStat > 2.5) return 0.01
  if (tStat > 2.0) return 0.05
  if (tStat > 1.5) return 0.1
  return 0.2
}

function cohensD(group1: number[], group2: number[]): number | null {
  if (group1.length === 0 || group2.length === 0) return null

  const mean1 = group1.reduce((sum, val) => sum + val, 0) / group1.length
  const mean2 = group2.reduce((sum, val) => sum + val, 0) / group2.length

  const variance1 = group1.reduce((sum, val) => sum + Math.pow(val - mean1, 2), 0) / (group1.length - 1)
  const variance2 = group2.reduce((sum, val) => sum + Math.pow(val - mean2, 2), 0) / (group2.length - 1)

  const pooledStd = Math.sqrt((variance1 + variance2) / 2)
  if (pooledStd === 0) return null

  return Math.abs(mean1 - mean2) / pooledStd
}

function calculateStats(values: number[]): StatisticalResult {
  if (values.length === 0) {
    return { mean: 0, ci: [0, 0], n: 0, std: 0 }
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1)
  const std = Math.sqrt(variance)
  const ci = bootstrap(values)

  return { mean, ci, n: values.length, std }
}

async function loadExperimentalData(): Promise<ComparisonRow[]> {
  try {
    const publicDir = path.join(process.cwd(), "public")
    const experimentsDir = path.join(
      publicDir,
      "research-experiments",
      "tool-real",
      "experiments",
      "03-context-adaptation",
    )

    // Load baseline data (adaptive-results.json)
    const baselinePath = path.join(experimentsDir, "adaptive-results.json")
    const baselineRaw = await fs.readFile(baselinePath, "utf-8")
    const baselineData = JSON.parse(baselineRaw)

    // Load Our Algorithm data (adaptive-results.our-algorithm.json)
    const ourAlgorithmPath = path.join(experimentsDir, "adaptive-results.our-algorithm.json")
    const ourAlgorithmRaw = await fs.readFile(ourAlgorithmPath, "utf-8")
    const ourAlgorithmData = JSON.parse(ourAlgorithmRaw)

    // Extract runs from both datasets
    const baselineRuns = baselineData.runs || []
    const ourAlgorithmRuns = ourAlgorithmData.runs || []

    // Pre-filter and group data by model and condition for efficiency
    const groupedBaseline = new Map<string, { vague: any[]; clear: any[] }>()

    // Group baseline runs (include all scenarios)
    for (const run of baselineRuns) {
      if (!groupedBaseline.has(run.model)) {
        groupedBaseline.set(run.model, { vague: [], clear: [] })
      }
      const modelGroup = groupedBaseline.get(run.model)!
      if (run.condition === "vague") {
        modelGroup.vague.push(run)
      } else if (run.condition === "clear") {
        modelGroup.clear.push(run)
      }
    }

    // Extract loop-specific results from our algorithm runs
    const groupedOurAlgorithmLoop1 = new Map<string, { vague: any[]; clear: any[] }>()
    const groupedOurAlgorithmLoop3 = new Map<string, { vague: any[]; clear: any[] }>()

    for (const run of ourAlgorithmRuns) {
      const loops = run.loops || []

      // Extract loop 1 results
      const loop1 = loops.find((l: any) => l.loop === 1)
      if (loop1) {
        if (!groupedOurAlgorithmLoop1.has(run.model)) {
          groupedOurAlgorithmLoop1.set(run.model, { vague: [], clear: [] })
        }
        const modelGroup = groupedOurAlgorithmLoop1.get(run.model)!
        const loopResult = {
          ...run,
          adapted: loop1.metrics?.adapted || false,
          success: loop1.success || false,
          cost: loop1.cost || 0,
          durationMs: loop1.durationMs || 0,
        }
        if (run.condition === "vague") {
          modelGroup.vague.push(loopResult)
        } else if (run.condition === "clear") {
          modelGroup.clear.push(loopResult)
        }
      }

      // Extract loop 3 results
      const loop3 = loops.find((l: any) => l.loop === 3)
      if (loop3) {
        if (!groupedOurAlgorithmLoop3.has(run.model)) {
          groupedOurAlgorithmLoop3.set(run.model, { vague: [], clear: [] })
        }
        const modelGroup = groupedOurAlgorithmLoop3.get(run.model)!
        const loopResult = {
          ...run,
          adapted: loop3.metrics?.adapted || false,
          success: loop3.success || false,
          cost: loop3.cost || 0,
          durationMs: loop3.durationMs || 0,
        }
        if (run.condition === "vague") {
          modelGroup.vague.push(loopResult)
        } else if (run.condition === "clear") {
          modelGroup.clear.push(loopResult)
        }
      }
    }

    // Get all models that have data
    const models = Array.from(
      new Set([...groupedBaseline.keys(), ...groupedOurAlgorithmLoop1.keys(), ...groupedOurAlgorithmLoop3.keys()]),
    ).filter(Boolean)

    const results: ComparisonRow[] = []

    for (const model of models) {
      const baselineGroup = groupedBaseline.get(model) || {
        vague: [],
        clear: [],
      }
      const vagueRuns = baselineGroup.vague
      const clearRuns = baselineGroup.clear
      const ourAlgorithmLoop1Group = groupedOurAlgorithmLoop1.get(model) || {
        vague: [],
        clear: [],
      }
      const ourAlgorithmLoop3Group = groupedOurAlgorithmLoop3.get(model) || {
        vague: [],
        clear: [],
      }

      if (
        vagueRuns.length === 0 &&
        clearRuns.length === 0 &&
        ourAlgorithmLoop1Group.vague.length === 0 &&
        ourAlgorithmLoop1Group.clear.length === 0 &&
        ourAlgorithmLoop3Group.vague.length === 0 &&
        ourAlgorithmLoop3Group.clear.length === 0
      )
        continue

      // Extract all metrics in single pass for each condition
      const extractMetrics = (runs: any[]) => {
        const adaptations: number[] = []
        const costs: number[] = []
        const durations: number[] = []

        for (const r of runs) {
          adaptations.push(r.adapted ? 1 : 0)
          costs.push(r.cost || 0)
          durations.push((r.durationMs || 0) / 1000)
        }

        return { adaptations, costs, durations }
      }

      const vagueMetrics = extractMetrics(vagueRuns)
      const clearMetrics = extractMetrics(clearRuns)
      const thisMethod1RunVagueMetrics = extractMetrics(ourAlgorithmLoop1Group.vague)
      const thisMethod1RunClearMetrics = extractMetrics(ourAlgorithmLoop1Group.clear)
      const thisMethod3RunsVagueMetrics = extractMetrics(ourAlgorithmLoop3Group.vague)
      const thisMethod3RunsClearMetrics = extractMetrics(ourAlgorithmLoop3Group.clear)

      // Statistical analysis for each condition
      const vagueAdaptationStats = calculateStats(vagueMetrics.adaptations.map((x: number) => x * 100))
      const clearAdaptationStats = calculateStats(clearMetrics.adaptations.map((x: number) => x * 100))
      const thisMethod1RunVagueAdaptationStats = calculateStats(
        thisMethod1RunVagueMetrics.adaptations.map((x: number) => x * 100),
      )
      const thisMethod1RunClearAdaptationStats = calculateStats(
        thisMethod1RunClearMetrics.adaptations.map((x: number) => x * 100),
      )
      const thisMethod3RunsVagueAdaptationStats = calculateStats(
        thisMethod3RunsVagueMetrics.adaptations.map((x: number) => x * 100),
      )
      const thisMethod3RunsClearAdaptationStats = calculateStats(
        thisMethod3RunsClearMetrics.adaptations.map((x: number) => x * 100),
      )

      const vagueCostStats = calculateStats(vagueMetrics.costs)
      const clearCostStats = calculateStats(clearMetrics.costs)
      const thisMethod1RunVagueCostStats = calculateStats(thisMethod1RunVagueMetrics.costs)
      const thisMethod1RunClearCostStats = calculateStats(thisMethod1RunClearMetrics.costs)
      const thisMethod3RunsVagueCostStats = calculateStats(thisMethod3RunsVagueMetrics.costs)
      const thisMethod3RunsClearCostStats = calculateStats(thisMethod3RunsClearMetrics.costs)

      const vagueDurationStats = calculateStats(vagueMetrics.durations)
      const clearDurationStats = calculateStats(clearMetrics.durations)
      const thisMethod1RunVagueDurationStats = calculateStats(thisMethod1RunVagueMetrics.durations)
      const thisMethod1RunClearDurationStats = calculateStats(thisMethod1RunClearMetrics.durations)
      const thisMethod3RunsVagueDurationStats = calculateStats(thisMethod3RunsVagueMetrics.durations)
      const thisMethod3RunsClearDurationStats = calculateStats(thisMethod3RunsClearMetrics.durations)

      // Significance tests (against vague baseline)
      const clearVsVagueAdaptationP = tTest(vagueMetrics.adaptations, clearMetrics.adaptations)
      const thisMethod1RunVagueVsVagueAdaptationP = tTest(
        vagueMetrics.adaptations,
        thisMethod1RunVagueMetrics.adaptations,
      )
      const thisMethod1RunClearVsVagueAdaptationP = tTest(
        vagueMetrics.adaptations,
        thisMethod1RunClearMetrics.adaptations,
      )
      const thisMethod3RunsVagueVsVagueAdaptationP = tTest(
        vagueMetrics.adaptations,
        thisMethod3RunsVagueMetrics.adaptations,
      )
      const thisMethod3RunsClearVsVagueAdaptationP = tTest(
        vagueMetrics.adaptations,
        thisMethod3RunsClearMetrics.adaptations,
      )

      // Effect sizes (against vague baseline)
      const clearVsVagueEffectSize = cohensD(vagueMetrics.adaptations, clearMetrics.adaptations)
      const thisMethod1RunVagueVsVagueEffectSize = cohensD(
        vagueMetrics.adaptations,
        thisMethod1RunVagueMetrics.adaptations,
      )
      const thisMethod1RunClearVsVagueEffectSize = cohensD(
        vagueMetrics.adaptations,
        thisMethod1RunClearMetrics.adaptations,
      )
      const thisMethod3RunsVagueVsVagueEffectSize = cohensD(
        vagueMetrics.adaptations,
        thisMethod3RunsVagueMetrics.adaptations,
      )
      const thisMethod3RunsClearVsVagueEffectSize = cohensD(
        vagueMetrics.adaptations,
        thisMethod3RunsClearMetrics.adaptations,
      )

      // Clean model name for display
      const cleanModelName = model.replace("openai/", "").replace("anthropic/", "").replace("google/", "")

      // Add vague prompt row (baseline)
      if (vagueRuns.length > 0) {
        results.push({
          method: "Vague Prompt",
          model: cleanModelName,
          n: vagueRuns.length,
          adaptationRate: vagueAdaptationStats,
          avgCost: vagueCostStats,
          avgDuration: vagueDurationStats,
          pValue: null, // Reference group
          effectSize: null,
          significant: false,
        })
      }

      // Add clear prompt row
      if (clearRuns.length > 0) {
        results.push({
          method: "Clear Prompt",
          model: cleanModelName,
          n: clearRuns.length,
          adaptationRate: clearAdaptationStats,
          avgCost: clearCostStats,
          avgDuration: clearDurationStats,
          pValue: clearVsVagueAdaptationP,
          effectSize: clearVsVagueEffectSize,
          significant: clearVsVagueAdaptationP !== null && clearVsVagueAdaptationP < 0.05,
        })
      }

      // Add our method rows - separate by condition
      if (ourAlgorithmLoop1Group.vague.length > 0) {
        results.push({
          method: "This Paper (1 Run, Vague)",
          model: cleanModelName,
          n: ourAlgorithmLoop1Group.vague.length,
          adaptationRate: thisMethod1RunVagueAdaptationStats,
          avgCost: thisMethod1RunVagueCostStats,
          avgDuration: thisMethod1RunVagueDurationStats,
          pValue: thisMethod1RunVagueVsVagueAdaptationP,
          effectSize: thisMethod1RunVagueVsVagueEffectSize,
          significant: thisMethod1RunVagueVsVagueAdaptationP !== null && thisMethod1RunVagueVsVagueAdaptationP < 0.05,
        })
      }

      if (ourAlgorithmLoop1Group.clear.length > 0) {
        results.push({
          method: "This Paper (1 Run, Clear)",
          model: cleanModelName,
          n: ourAlgorithmLoop1Group.clear.length,
          adaptationRate: thisMethod1RunClearAdaptationStats,
          avgCost: thisMethod1RunClearCostStats,
          avgDuration: thisMethod1RunClearDurationStats,
          pValue: thisMethod1RunClearVsVagueAdaptationP,
          effectSize: thisMethod1RunClearVsVagueEffectSize,
          significant: thisMethod1RunClearVsVagueAdaptationP !== null && thisMethod1RunClearVsVagueAdaptationP < 0.05,
        })
      }

      if (ourAlgorithmLoop3Group.vague.length > 0) {
        results.push({
          method: "This Paper (3 Runs, Vague)",
          model: cleanModelName,
          n: ourAlgorithmLoop3Group.vague.length,
          adaptationRate: thisMethod3RunsVagueAdaptationStats,
          avgCost: thisMethod3RunsVagueCostStats,
          avgDuration: thisMethod3RunsVagueDurationStats,
          pValue: thisMethod3RunsVagueVsVagueAdaptationP,
          effectSize: thisMethod3RunsVagueVsVagueEffectSize,
          significant: thisMethod3RunsVagueVsVagueAdaptationP !== null && thisMethod3RunsVagueVsVagueAdaptationP < 0.05,
        })
      }

      if (ourAlgorithmLoop3Group.clear.length > 0) {
        results.push({
          method: "This Paper (3 Runs, Clear)",
          model: cleanModelName,
          n: ourAlgorithmLoop3Group.clear.length,
          adaptationRate: thisMethod3RunsClearAdaptationStats,
          avgCost: thisMethod3RunsClearCostStats,
          avgDuration: thisMethod3RunsClearDurationStats,
          pValue: thisMethod3RunsClearVsVagueAdaptationP,
          effectSize: thisMethod3RunsClearVsVagueEffectSize,
          significant: thisMethod3RunsClearVsVagueAdaptationP !== null && thisMethod3RunsClearVsVagueAdaptationP < 0.05,
        })
      }
    }

    return results
  } catch (error) {
    console.error("Error loading experimental data:", error)
    throw new Error(`Failed to load experimental data: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export async function GET() {
  // Require authentication
  const authResult = await requireAuth()
  if (authResult instanceof NextResponse) return authResult

  try {
    const data = await loadExperimentalData()

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
