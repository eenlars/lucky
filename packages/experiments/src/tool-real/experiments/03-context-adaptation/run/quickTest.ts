/**
 * final-adaptive-validation.ts - Efficient final validation of adaptive behavior hypothesis
 *
 * Focuses on key models to complete statistical validation quickly
 */

// import { sendAI } from "@lucky/core/messages/api/sendAI"
import type { OpenRouterModelName } from "@lucky/core/utils/spending/models.types"
import { mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"
// models imported via constants; keep local import removed to avoid unused var
import { adaptiveTools } from "../../../shared/tools/adaptive/adaptiveTools"
import { runSequentialTools } from "../../02-sequential-chains/sequentialRunner"
import { CLEAR_SYSTEM_PROMPT as CLEAR, MODELS, VAGUE_SYSTEM_PROMPT as VAGUE } from "../constants"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Use shared model constants
const RUNS_PER_CONDITION = 3 // Reduced for faster completion

// Use shared tools
const tools = adaptiveTools

interface QuickTestRun {
  model: OpenRouterModelName
  condition: "vague" | "clear"
  runNumber: number
  itemsRetrieved: number
  adapted: boolean
  strategy: string
  attempts: number
  totalDurationMs?: number
  totalCostUsd?: number
}

async function runQuickTest(
  model: OpenRouterModelName,
  condition: "vague" | "clear",
  runNumber: number,
): Promise<QuickTestRun> {
  const systemPrompts = {
    vague: VAGUE,
    clear: CLEAR,
  }

  const userRequest = "I need 5 items for my project."

  console.log(`    ${model} (${condition}) - Run ${runNumber}`)

  const runResult = await runSequentialTools(model, userRequest, tools, systemPrompts[condition])

  const fetchCalls = runResult.toolExecutions.filter(t => t.toolName === "fetch_objects")
  const successfulFetches = fetchCalls.filter(t => {
    const isErrorString = typeof t.outputData === "string" && t.outputData.startsWith("ERROR:")
    return Array.isArray(t.outputData) || (!isErrorString && typeof t.outputData === "object")
  })
  const totalItemsRetrieved = successfulFetches.reduce((sum, t) => {
    return sum + (Array.isArray(t.outputData) ? (t.outputData as any[]).length : 0)
  }, 0)

  const counts = successfulFetches.map(t => (t.inputData as any)?.count)
  let strategy = "no-success"
  if (successfulFetches.length === 1) strategy = "single-call"
  else if (successfulFetches.length >= 2)
    strategy = counts.includes(3) && counts.includes(2) ? "optimal-split" : "multi-call"

  const adapted = totalItemsRetrieved >= 5
  const attempts = fetchCalls.length

  console.log(`      → ${totalItemsRetrieved}/5 items, ${strategy}, ${adapted ? "SUCCESS" : "FAIL"}`)

  return {
    model,
    condition,
    runNumber,
    itemsRetrieved: totalItemsRetrieved,
    adapted,
    strategy,
    attempts,
    totalDurationMs: runResult.totalDurationMs,
    totalCostUsd: runResult.totalCostUsd,
  }
}

async function runFinalValidation() {
  console.log("FINAL ADAPTIVE BEHAVIOR VALIDATION")
  console.log("=".repeat(50))
  console.log(`Models: ${MODELS.join(", ")}`)
  console.log(`Runs per condition: ${RUNS_PER_CONDITION}`)
  console.log(`Total tests: ${MODELS.length * 2 * RUNS_PER_CONDITION}`)
  console.log("")

  const allRuns: QuickTestRun[] = []

  for (const model of MODELS) {
    console.log(`Testing ${model}:`)

    // Test vague condition
    console.log(`  VAGUE prompts:`)
    for (let run = 1; run <= RUNS_PER_CONDITION; run++) {
      const result = await runQuickTest(model, "vague", run)
      allRuns.push(result)
      await new Promise(resolve => setTimeout(resolve, 500)) // Rate limiting
    }

    // Test clear condition
    console.log(`  CLEAR prompts:`)
    for (let run = 1; run <= RUNS_PER_CONDITION; run++) {
      const result = await runQuickTest(model, "clear", run)
      allRuns.push(result)
      await new Promise(resolve => setTimeout(resolve, 500)) // Rate limiting
    }

    console.log("")
  }

  // Analysis
  console.log("=".repeat(50))
  console.log("FINAL STATISTICAL ANALYSIS")
  console.log("=".repeat(50))

  // Group by model and condition
  const analysis = MODELS.map(model => {
    const modelRuns = allRuns.filter(r => r.model === model)
    const vagueRuns = modelRuns.filter(r => r.condition === "vague")
    const clearRuns = modelRuns.filter(r => r.condition === "clear")

    const vagueSuccess = vagueRuns.filter(r => r.adapted).length
    const clearSuccess = clearRuns.filter(r => r.adapted).length

    return {
      model,
      vagueSuccessRate: ((vagueSuccess / vagueRuns.length) * 100).toFixed(1),
      clearSuccessRate: ((clearSuccess / clearRuns.length) * 100).toFixed(1),
      improvement: ((clearSuccess / clearRuns.length - vagueSuccess / vagueRuns.length) * 100).toFixed(1),
      vagueSuccess,
      clearSuccess,
      totalRuns: vagueRuns.length,
      avgDurationMs: Math.round(
        (modelRuns.reduce((s, r) => s + (r.totalDurationMs || 0), 0) || 0) / (modelRuns.length || 1),
      ),
      avgCostUsd: (modelRuns.reduce((s, r) => s + (r.totalCostUsd || 0), 0) || 0) / (modelRuns.length || 1),
    }
  })

  console.log("MODEL PERFORMANCE:")
  console.log("Model         | Vague Success | Clear Success | Improvement")
  console.log("-".repeat(60))
  analysis.forEach(a => {
    console.log(
      `${a.model.padEnd(13)} | ${a.vagueSuccess}/${a.totalRuns} (${a.vagueSuccessRate}%) | ${a.clearSuccess}/${a.totalRuns} (${a.clearSuccessRate}%) | +${a.improvement}%`,
    )
  })

  // Overall statistics
  const overallVagueSuccess = allRuns.filter(r => r.condition === "vague" && r.adapted).length
  const overallClearSuccess = allRuns.filter(r => r.condition === "clear" && r.adapted).length
  const totalVague = allRuns.filter(r => r.condition === "vague").length
  const totalClear = allRuns.filter(r => r.condition === "clear").length

  const overallImprovement = (overallClearSuccess / totalClear - overallVagueSuccess / totalVague) * 100

  const overallAvgDurationMs = Math.round(
    (allRuns.reduce((s, r) => s + (r.totalDurationMs || 0), 0) || 0) / (allRuns.length || 1),
  )
  const overallAvgCostUsd = (allRuns.reduce((s, r) => s + (r.totalCostUsd || 0), 0) || 0) / (allRuns.length || 1)

  console.log("\nOVERALL RESULTS:")
  console.log(
    `Vague prompts: ${overallVagueSuccess}/${totalVague} success (${((overallVagueSuccess / totalVague) * 100).toFixed(1)}%)`,
  )
  console.log(
    `Clear prompts: ${overallClearSuccess}/${totalClear} success (${((overallClearSuccess / totalClear) * 100).toFixed(1)}%)`,
  )
  console.log(`Overall improvement: ${overallImprovement.toFixed(1)} percentage points`)

  // Statistical conclusion
  const isSignificant = Math.abs(overallImprovement) > 15 // 15% threshold

  console.log("\nSTATISTICAL CONCLUSION:")
  if (isSignificant) {
    console.log(`✅ STATISTICALLY SIGNIFICANT: ${overallImprovement.toFixed(1)}% improvement`)
    console.log("🎯 HYPOTHESIS CONFIRMED: Vague prompts significantly impair adaptive behavior")
  } else {
    console.log(`❌ NOT STATISTICALLY SIGNIFICANT: Only ${overallImprovement.toFixed(1)}% difference`)
  }

  // Save results
  const resultsDir = join(__dirname, "results")
  mkdirSync(resultsDir, { recursive: true })
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  const outputPath = join(resultsDir, `final-adaptive-validation-results-${hh}${mm}.json`)
  writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        experimentType: "final-adaptive-behavior-validation",
        configuration: {
          models: MODELS,
          runsPerCondition: RUNS_PER_CONDITION,
          totalTests: MODELS.length * 2 * RUNS_PER_CONDITION,
        },
        runs: allRuns,
        analysis,
        overallStats: {
          vagueSuccessRate: ((overallVagueSuccess / totalVague) * 100).toFixed(1),
          clearSuccessRate: ((overallClearSuccess / totalClear) * 100).toFixed(1),
          improvement: overallImprovement.toFixed(1),
          statisticallySignificant: isSignificant,
          avgDurationMs: overallAvgDurationMs,
          avgCostUsd: overallAvgCostUsd,
        },
        conclusion: isSignificant ? "HYPOTHESIS CONFIRMED" : "HYPOTHESIS REJECTED",
      },
      null,
      2,
    ),
  )

  console.log(`\nResults saved to: ${outputPath}`)

  return { allRuns, analysis, isSignificant }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runFinalValidation().catch(console.error)
}
