/**
 * runFocusedSequentialExperiment.ts - Focused experiment for model comparison
 * Tests 3 models × 3 chains × 1 prompt each = 9 scenarios total
 */
import { mkdirSync, writeFileSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

import type { AllowedModelName } from "@core/utils/spending/models.types"
import {
  businessChainOrder,
  businessChainTools,
} from "../../shared/tools/sequential-chains/businessChain"
import {
  documentChainOrder,
  documentChainTools,
} from "../../shared/tools/sequential-chains/documentChain"
import {
  mathChainOrder,
  mathChainTools,
} from "../../shared/tools/sequential-chains/mathChain"
import { validateSequentialExecution } from "./sequentialEvaluation"
import {
  businessChainPrompts,
  documentChainPrompts,
  mathChainPrompts,
} from "./sequentialPrompts"
import { runSequentialTools } from "./sequentialRunner"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// focused experiment configuration - using OpenRouter models
const TEST_MODELS: AllowedModelName<"openrouter">[] = [
  "google/gemini-2.5-flash-lite",
  "anthropic/claude-sonnet-4",
  // "google/gemini-2.5-pro-preview",
]

interface ChainConfig {
  name: string
  tools: any
  order: string[]
  prompt: any
}

const CHAINS: ChainConfig[] = [
  {
    name: "2-step",
    tools: mathChainTools,
    order: mathChainOrder,
    prompt: mathChainPrompts[0], // basic-processing
  },
  {
    name: "5-step",
    tools: documentChainTools,
    order: documentChainOrder,
    prompt: documentChainPrompts[0], // document-processing
  },
  {
    name: "10-step",
    tools: businessChainTools,
    order: businessChainOrder,
    prompt: businessChainPrompts[0], // business-process
  },
]

async function runFocusedExperiment() {
  console.log("Focused Sequential Tool Execution Experiment")
  console.log("=".repeat(45))
  console.log(`Models: ${TEST_MODELS.join(", ")}`)
  console.log(`Chains: ${CHAINS.map((c) => c.name).join(", ")}`)
  console.log(`Total scenarios: ${TEST_MODELS.length * CHAINS.length}`)
  console.log("")

  const allResults: Array<{
    model: string
    chain: string
    promptId: string
    validation: any
    toolExecutions: any[]
    finalResponse: string
    success: boolean
    error?: string
    timestamp: string
  }> = []

  let scenarioCount = 0
  const totalScenarios = TEST_MODELS.length * CHAINS.length

  // run each model × chain combination
  for (const model of TEST_MODELS) {
    console.log(`\nTesting model: ${model}`)
    console.log("-".repeat(25))

    for (const chain of CHAINS) {
      scenarioCount++
      console.log(
        `${chain.name} chain (${chain.order.length} steps) - Scenario ${scenarioCount}/${totalScenarios}`
      )

      try {
        const startTime = Date.now()

        const result = await runSequentialTools(
          model,
          chain.prompt.prompt,
          chain.tools as any
        )

        const validation = validateSequentialExecution(
          result.toolExecutions,
          chain.order
        )
        const endTime = Date.now()
        const duration = endTime - startTime

        console.log(
          `Tools executed: ${result.toolExecutions.length}/${chain.order.length}`
        )
        console.log(
          `Score: ${validation.score} | Order: ${validation.orderCorrect ? "✓" : "✗"} | Flow: ${validation.dataFlowCorrect ? "✓" : "✗"}`
        )
        console.log(`Duration: ${duration}ms`)
        if (!validation.dataFlowCorrect) {
          console.log(`Issue: ${validation.details}`)
        }

        allResults.push({
          model,
          chain: chain.name,
          promptId: chain.prompt.id,
          validation,
          toolExecutions: result.toolExecutions,
          finalResponse: result.finalResponse,
          success: result.success,
          timestamp: new Date().toISOString(),
        })
      } catch (error) {
        console.log(`ERROR: ${error}`)
        allResults.push({
          model,
          chain: chain.name,
          promptId: chain.prompt.id,
          validation: { score: 0, details: "Execution failed" },
          toolExecutions: [],
          finalResponse: "",
          success: false,
          error: String(error),
          timestamp: new Date().toISOString(),
        })
      }

      // small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  // analyze results
  console.log("\n" + "=".repeat(45))
  console.log("EXPERIMENT COMPLETE - RESULTS ANALYSIS")
  console.log("=".repeat(45))

  // model performance comparison
  const modelStats = TEST_MODELS.map((model) => {
    const modelResults = allResults.filter((r) => r.model === model)
    const avgScore =
      modelResults.reduce((sum, r) => sum + (r.validation?.score || 0), 0) /
      modelResults.length
    const perfectCount = modelResults.filter(
      (r) => r.validation?.score === 1.0
    ).length

    return {
      model,
      avgScore,
      perfectCount,
      totalTests: modelResults.length,
      percentage: (avgScore * 100).toFixed(1),
    }
  })

  // chain complexity analysis
  const chainStats = CHAINS.map((chain) => {
    const chainResults = allResults.filter((r) => r.chain === chain.name)
    const avgScore =
      chainResults.reduce((sum, r) => sum + (r.validation?.score || 0), 0) /
      chainResults.length
    const perfectCount = chainResults.filter(
      (r) => r.validation?.score === 1.0
    ).length

    return {
      chain: chain.name,
      avgScore,
      perfectCount,
      totalTests: chainResults.length,
      percentage: (avgScore * 100).toFixed(1),
    }
  })

  console.log("\nMODEL PERFORMANCE RANKING:")
  modelStats
    .sort((a, b) => b.avgScore - a.avgScore)
    .forEach((model, index) => {
      console.log(
        `${index + 1}. ${model.model}: ${model.percentage}% avg (${model.perfectCount}/${model.totalTests} perfect)`
      )
    })

  console.log("\nCHAIN COMPLEXITY ANALYSIS:")
  chainStats.forEach((chain) => {
    console.log(
      `${chain.chain}: ${chain.percentage}% avg (${chain.perfectCount}/${chain.totalTests} perfect)`
    )
  })

  // detailed breakdown
  console.log("\nDETAILED BREAKDOWN:")
  TEST_MODELS.forEach((model) => {
    console.log(`\n${model}:`)
    CHAINS.forEach((chain) => {
      const result = allResults.find(
        (r) => r.model === model && r.chain === chain.name
      )
      if (result) {
        const status =
          result.validation.score === 1.0
            ? "✓ PERFECT"
            : result.validation.score >= 0.7
              ? "⚠ PARTIAL"
              : "✗ FAILED"
        console.log(`${chain.name}: ${status} (${result.validation.score})`)
      }
    })
  })

  // save results
  const now = new Date()
  const timestamp = now.toISOString()
  const hhmm = `${now.getHours().toString().padStart(2, "0")}${now
    .getMinutes()
    .toString()
    .padStart(2, "0")}`

  // Ensure results directory exists
  const resultsDir = join(__dirname, "results")
  mkdirSync(resultsDir, { recursive: true })

  const outputFiles = {
    results: join(resultsDir, `focused-results-${hhmm}.json`),
    summary: join(resultsDir, `focused-summary-${hhmm}.json`),
  }

  writeFileSync(outputFiles.results, JSON.stringify(allResults, null, 2))
  writeFileSync(
    outputFiles.summary,
    JSON.stringify(
      {
        timestamp,
        experimentType: "focused-sequential-execution",
        totalScenarios: allResults.length,
        modelPerformance: modelStats,
        chainComplexity: chainStats,
        keyFindings: {
          bestModel: modelStats[0],
          easiestChain: chainStats.find(
            (c) =>
              c.avgScore === Math.max(...chainStats.map((cs) => cs.avgScore))
          ),
          hardestChain: chainStats.find(
            (c) =>
              c.avgScore === Math.min(...chainStats.map((cs) => cs.avgScore))
          ),
        },
      },
      null,
      2
    )
  )

  console.log(`\nResults saved to:`)
  console.log(`Detailed: ${outputFiles.results}`)
  console.log(`Summary: ${outputFiles.summary}`)

  return { modelStats, chainStats, allResults }
}

// run the experiment
runFocusedExperiment().catch(console.error)
