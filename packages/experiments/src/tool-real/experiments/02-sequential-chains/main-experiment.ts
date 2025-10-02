import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
/**
 * runFullSequentialExperiment.ts - Full sequential execution experiment
 * Scale: models × chains × prompts × repetitions (current REPETITIONS = 2)
 */
import { experimentalModels } from "@lucky/examples/settings/models"

import type { OpenRouterModelName } from "@lucky/core/utils/spending/models.types"
import type { ToolSet } from "ai"
import { businessChainOrder, businessChainTools } from "../../shared/tools/sequential-chains/businessChain"
import { locationChainOrder, locationChainTools } from "../../shared/tools/sequential-chains/locationChain"
import { mathChainOrder, mathChainTools } from "../../shared/tools/sequential-chains/mathChain"
import { analyzeExperimentResults, validateSequentialExecution } from "./sequentialEvaluation"
import { businessChainPrompts, locationChainPrompts, mathChainPrompts } from "./sequentialPrompts"
import { runSequentialTools } from "./sequentialRunner"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// experiment configuration
const MODELS: OpenRouterModelName[] = [
  experimentalModels.gpt4oMini.id,
  experimentalModels.gpt4o.id,
  experimentalModels.mistral.id,
  experimentalModels.gpt35turbo.id,
  experimentalModels.claude35haiku.id,
  // experimentalModels.gemini25pro.id,
]
const REPETITIONS = 2
const MAX_CONCURRENCY = 20

interface ChainConfig {
  name: string
  tools: ToolSet
  order: string[]
  prompts: any[]
}

const CHAINS: ChainConfig[] = [
  {
    name: "2-step",
    tools: mathChainTools,
    order: mathChainOrder,
    prompts: mathChainPrompts,
  },
  {
    name: "3-step",
    tools: locationChainTools,
    order: locationChainOrder,
    prompts: locationChainPrompts,
  },
  {
    name: "10-step",
    tools: businessChainTools,
    order: businessChainOrder,
    prompts: businessChainPrompts,
  },
]

async function runFullExperiment() {
  console.log("Starting Sequential Tool Execution Experiment")
  console.log("=".repeat(50))
  console.log(`Models: ${MODELS.join(", ")}`)
  console.log(`Chains: ${CHAINS.map(c => c.name).join(", ")}`)
  console.log(`Repetitions per scenario: ${REPETITIONS}`)
  console.log(
    `Total scenarios: ${MODELS.length * CHAINS.length * CHAINS.reduce((sum, c) => sum + c.prompts.length, 0) * REPETITIONS}`,
  )
  console.log("")

  const allResults: Array<{
    model: string
    chain: string
    promptId: string
    repetition: number
    validation: any
    toolExecutions: any[]
    finalResponse: string
    success: boolean
    error?: string
  }> = []

  let scenarioCount = 0
  const totalScenarios =
    MODELS.length * CHAINS.length * CHAINS.reduce((sum, c) => sum + c.prompts.length, 0) * REPETITIONS

  // run each model × chain × prompt × repetition combination
  for (const model of MODELS) {
    console.log(`\nTesting model: ${model}`)
    console.log("-".repeat(30))

    // Build tasks across all chains/prompts/repetitions and run with a max concurrency cap
    const tasks: Array<() => Promise<void>> = []

    for (const chain of CHAINS) {
      console.log(`Chain: ${chain.name} (${chain.order.length} steps)`)
      for (const prompt of chain.prompts) {
        console.log(`Prompt: ${prompt.id}`)
        for (let rep = 1; rep <= REPETITIONS; rep++) {
          tasks.push(async () => {
            const currentScenario = ++scenarioCount
            console.log(`Rep ${rep}/${REPETITIONS} (${currentScenario}/${totalScenarios})`)

            try {
              const result = await runSequentialTools(model, prompt.prompt, chain.tools)

              const validation = validateSequentialExecution(result.toolExecutions, chain.order)

              console.log(
                `Score: ${validation.score}, Order: ${validation.orderCorrect}, Flow: ${validation.dataFlowCorrect}`,
              )

              allResults.push({
                model,
                chain: chain.name,
                promptId: prompt.id,
                repetition: rep,
                validation,
                toolExecutions: result.toolExecutions,
                finalResponse: result.finalResponse,
                success: result.success,
              })
            } catch (error) {
              console.log(`ERROR: ${error}`)
              allResults.push({
                model,
                chain: chain.name,
                promptId: prompt.id,
                repetition: rep,
                validation: { score: 0, details: "Execution failed" },
                toolExecutions: [],
                finalResponse: "",
                success: false,
                error: String(error),
              })
            }
          })
        }
      }
    }

    // Simple concurrency pool
    let next = 0
    const workers = Array.from({ length: Math.min(MAX_CONCURRENCY, tasks.length) }, async () => {
      while (next < tasks.length) {
        const idx = next++
        await tasks[idx]()
      }
    })
    await Promise.all(workers)
  }

  // analyze results
  console.log(`\n${"=".repeat(50)}`)
  console.log("EXPERIMENT COMPLETE - ANALYZING RESULTS")
  console.log("=".repeat(50))

  const analysis = analyzeExperimentResults(allResults)

  console.log("\nMODEL PERFORMANCE:")
  analysis.modelPerformance.forEach(model => {
    console.log(
      `${model.model}: ${(model.avgScore * 100).toFixed(1)}% avg, ${model.perfectCount}/${model.totalTests} perfect`,
    )
  })

  console.log("\nCHAIN COMPLEXITY:")
  analysis.chainComplexity.forEach(chain => {
    console.log(
      `${chain.chain}: ${(chain.avgScore * 100).toFixed(1)}% avg, ${chain.perfectCount}/${chain.totalTests} perfect`,
    )
  })

  console.log("\nOVERALL STATS:")
  console.log(`Total tests: ${analysis.overallStats.totalTests}`)
  console.log(`Average score: ${(analysis.overallStats.avgScore * 100).toFixed(1)}%`)
  console.log(
    `Perfect executions: ${analysis.overallStats.perfectExecutions}/${analysis.overallStats.totalTests} (${((analysis.overallStats.perfectExecutions / analysis.overallStats.totalTests) * 100).toFixed(1)}%)`,
  )

  // save detailed results
  const now = new Date()
  const timestamp = now.toISOString()
  const hhmm = `${now.getHours().toString().padStart(2, "0")}${now.getMinutes().toString().padStart(2, "0")}`

  // Ensure results directory exists
  const resultsDir = join(__dirname, "results")
  mkdirSync(resultsDir, { recursive: true })

  const outputFiles = {
    results: join(resultsDir, `sequential-results-${hhmm}.json`),
    analysis: join(resultsDir, `sequential-analysis-${hhmm}.json`),
    summary: join(resultsDir, `sequential-summary-${hhmm}.json`),
  }

  writeFileSync(outputFiles.results, JSON.stringify(allResults, null, 2))
  writeFileSync(outputFiles.analysis, JSON.stringify(analysis, null, 2))
  writeFileSync(
    outputFiles.summary,
    JSON.stringify(
      {
        timestamp,
        experimentType: "sequential-tool-execution",
        totalScenarios: allResults.length,
        modelsPerformance: analysis.modelPerformance,
        chainComplexity: analysis.chainComplexity,
        overallStats: analysis.overallStats,
        keyFindings: {
          bestModel: analysis.modelPerformance[0],
          easiestChain: analysis.chainComplexity[0],
          hardestChain: analysis.chainComplexity[analysis.chainComplexity.length - 1],
        },
      },
      null,
      2,
    ),
  )

  // Also write copies into the public folder for easy static access
  try {
    const publicDir = join(process.cwd(), "public/research-experiments/tool-real/experiments/02-sequential-chains")
    mkdirSync(publicDir, { recursive: true })
    // Fixed filenames for app consumption
    writeFileSync(join(publicDir, "sequential-results.json"), JSON.stringify(allResults, null, 2))
    writeFileSync(join(publicDir, "sequential-analysis.json"), JSON.stringify(analysis, null, 2))
    writeFileSync(
      join(publicDir, "sequential-summary.json"),
      JSON.stringify(
        {
          timestamp,
          experimentType: "sequential-tool-execution",
          totalScenarios: allResults.length,
          modelsPerformance: analysis.modelPerformance,
          chainComplexity: analysis.chainComplexity,
          overallStats: analysis.overallStats,
        },
        null,
        2,
      ),
    )
    console.log(`Public copies saved to: ${publicDir}`)
  } catch (err) {
    console.warn(`Failed to write public copies: ${err instanceof Error ? err.message : String(err)}`)
  }

  console.log("\nResults saved to:")
  console.log(`Detailed: ${outputFiles.results}`)
  console.log(`Analysis: ${outputFiles.analysis}`)
  console.log(`Summary: ${outputFiles.summary}`)

  return analysis
}

// run the experiment
runFullExperiment().catch(console.error)
