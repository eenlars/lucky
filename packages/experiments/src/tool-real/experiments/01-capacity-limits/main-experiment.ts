/**
 * Tool Capacity Experiment - Tests whether adding too many tools inflicts errors
 *
 * Research Question: At what point does the number of tools become too many for models to handle?
 *
 * Methodology:
 * - Models: GPT-3.5-turbo, GPT-4o-mini, GPT-4-turbo
 * - Tool counts: 4, 8, 16, 32, 64, 128
 * - 5 tasks that each require one specific tool
 * - Metrics: Selection accuracy, latency per tool call, failure type classification
 */
import { lgg } from "@core/utils/logging/Logger"
import type { AllowedModelName } from "@core/utils/spending/models.types"
import { experimentalModels } from "@examples/settings/models"
import { mkdirSync, writeFileSync } from "fs"
import { join, resolve } from "path"
import { fileURLToPath } from "url"
import {
  classifyFailure,
  evaluate,
  type FailureType,
  type RunOutcome,
} from "./evaluation"
import { allToolSpecs, chatWithTools } from "./openaiRunner"
import { prompts } from "./prompts"

const __dirname = process.cwd()

export type ToolCapacityResponse = {
  timestamp: string
  endTime: string
  configuration: {
    models: string[]
    toolCounts: number[]
    runsPerConfig: number
    totalPrompts: number
  }
  summary: {
    totalRuns: number
    successfulRuns: number
    overallAccuracy: number
    averageLatency: number
    failureTypes: Record<string, number>
  }
  results: ToolCapacityResult[]
}

// experiment configuration
const TEST_MODELS: AllowedModelName<"openrouter">[] = [
  experimentalModels.gpt35turbo.id,
  experimentalModels.gpt41.id,
  experimentalModels.geminiLite.id,
  experimentalModels.claude35haiku.id,
  experimentalModels.gpt41nano.id,
]
const REQUIRED_TOOL_NAMES: string[] = Array.from(
  new Set(prompts.map((p) => p.expects.tool))
)
const REQUIRED_TOOL_COUNT = REQUIRED_TOOL_NAMES.length
const TOOL_COUNTS = [REQUIRED_TOOL_COUNT, 8, 16, 32, 64, 128]
const RUNS_PER_CONFIG = 5 // multiple runs for statistical significance
const RATE_LIMIT_MS = 500 // delay between api calls

export interface ToolCapacityResult extends RunOutcome {
  model: string
  toolCount: number
  run: number
  latencyMs: number
  usdCost?: number
  toolCallCount?: number
  failureType?: FailureType
  selectedTool?: string
  expectedTool: string
  /** True if the final tool equals the expected terminal tool (selection-only signal) */
  selectionMatched?: boolean
}

export async function runToolCapacityExperiment() {
  const results: ToolCapacityResult[] = []
  const experimentStartTime = new Date().toISOString()

  lgg.info("Starting Tool Capacity Experiment")
  lgg.info(`Models: ${TEST_MODELS.join(", ")}`)
  lgg.info(`Tool counts: ${TOOL_COUNTS.join(", ")}`)
  lgg.info(`Tasks: ${prompts.length}`)
  lgg.info(`Runs per config: ${RUNS_PER_CONFIG}`)

  for (const model of TEST_MODELS) {
    lgg.info(`\nTesting model: ${model}`)

    for (const toolCount of TOOL_COUNTS) {
      lgg.info(`  Tool count: ${toolCount}`)

      // Always include all required tools; fill the rest with non-required tools
      const allNames = Object.keys(allToolSpecs)
      const missingRequired = REQUIRED_TOOL_NAMES.filter(
        (name) => !(name in allToolSpecs)
      )
      if (missingRequired.length) {
        lgg.warn(
          `Missing required tool specs: ${missingRequired.join(", ")}. They will be ignored.`
        )
      }

      const effectiveCount = Math.max(toolCount, REQUIRED_TOOL_COUNT)
      const pool = allNames.filter((n) => !REQUIRED_TOOL_NAMES.includes(n))
      const additionalCount = Math.max(0, effectiveCount - REQUIRED_TOOL_COUNT)
      const selectedToolNames = [
        ...REQUIRED_TOOL_NAMES.filter((n) => n in allToolSpecs),
        ...pool.slice(0, additionalCount),
      ]

      const tools = Object.fromEntries(
        selectedToolNames.map((name) => [
          name,
          allToolSpecs[name as keyof typeof allToolSpecs],
        ])
      )

      if (Object.keys(tools).length < toolCount) {
        lgg.warn(
          `Only ${Object.keys(tools).length} tools available, requested ${toolCount}`
        )
      }

      for (let promptIndex = 0; promptIndex < prompts.length; promptIndex++) {
        const prompt = prompts[promptIndex]
        lgg.info(
          `    Running prompt ${promptIndex + 1}/${prompts.length}: ${prompt.id}`
        )

        for (let run = 1; run <= RUNS_PER_CONFIG; run++) {
          lgg.info(`      Run ${run}/${RUNS_PER_CONFIG} - Starting API call...`)
          const runStartTime = Date.now()

          try {
            lgg.info(
              `        Calling sendAI with ${Object.keys(tools).length} tools...`
            )
            const trace = await chatWithTools(model, prompt.content, tools)
            const latencyMs = Date.now() - runStartTime
            lgg.info(
              `        API call completed in ${latencyMs}ms, got ${trace.toolCalls.length} tool calls`
            )

            const evaluation = await evaluate(trace, prompt.expects.tool)
            const selectedTool =
              trace.toolCalls[trace.toolCalls.length - 1]?.toolName
            lgg.info(
              `        Evaluation complete: ${evaluation.success ? "SUCCESS" : "FAILURE"}`
            )

            const result: ToolCapacityResult = {
              ...evaluation,
              model,
              toolCount: Object.keys(tools).length,
              run,
              latencyMs,
              usdCost: trace.usdCost,
              toolCallCount: trace.toolCalls.length,
              selectedTool,
              expectedTool: prompt.expects.tool,
              promptId: prompt.id,
              selectionMatched: selectedTool === prompt.expects.tool,
            }

            // Add failure type details
            if (!evaluation.success) {
              result.failureType =
                evaluation.failureType ||
                classifyFailure(trace, prompt.expects.tool)
              lgg.info(`        Failure type: ${result.failureType}`)
            }

            results.push(result)

            const status = evaluation.success ? "✓" : "✗"
            const baseMsg = `      ${prompt.id} run ${run}: ${status} (${latencyMs}ms, selected: ${selectedTool || "no tool"}, expected: ${prompt.expects.tool})`
            if (!evaluation.success && evaluation.details) {
              lgg.info(`${baseMsg} -> ${evaluation.details}`)
            } else {
              lgg.info(baseMsg)
            }
          } catch (error) {
            const latencyMs = Date.now() - runStartTime
            const errorMsg =
              error instanceof Error ? error.message : String(error)
            lgg.error(
              `        API call failed after ${latencyMs}ms: ${errorMsg}`
            )

            results.push({
              model,
              toolCount: Object.keys(tools).length,
              run,
              latencyMs,
              success: false,
              details: `Error: ${errorMsg}`,
              failureType: "F6",
              selectedTool: undefined,
              expectedTool: prompt.expects.tool,
              promptId: prompt.id,
              selectionMatched: false,
              toolCallCount: 0,
            })

            lgg.error(`      ${prompt.id} run ${run}: Error - ${errorMsg}`)
          }

          // rate limiting between calls
          lgg.info(`        Waiting ${RATE_LIMIT_MS}ms for rate limiting...`)
          await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS))
        }
      }
    }
  }

  // save detailed results
  const outputData: ToolCapacityResponse = {
    timestamp: experimentStartTime,
    endTime: new Date().toISOString(),
    configuration: {
      models: TEST_MODELS,
      toolCounts: TOOL_COUNTS,
      runsPerConfig: RUNS_PER_CONFIG,
      totalPrompts: prompts.length,
    },
    summary: generateSummary(results),
    results,
  }

  const outputPath = join(__dirname, "tool-capacity-results.json")
  writeFileSync(outputPath, JSON.stringify(outputData, null, 2))

  // Generate analysis
  const analysis = analyzeResults(results)
  const analysisPath = join(__dirname, "tool-capacity-analysis.json")
  writeFileSync(analysisPath, JSON.stringify(analysis, null, 2))

  // Also write copies into the public folder for easy static access
  try {
    const publicDir = join(
      process.cwd(),
      "public/research-experiments/tool-real/experiments/01-capacity-limits"
    )
    mkdirSync(publicDir, { recursive: true })
    writeFileSync(
      join(publicDir, "tool-capacity-results.json"),
      JSON.stringify(outputData, null, 2)
    )
    writeFileSync(
      join(publicDir, "tool-capacity-analysis.json"),
      JSON.stringify(analysis, null, 2)
    )
    lgg.info(`Public copies saved to: ${publicDir}`)
  } catch (err) {
    lgg.warn(
      `Failed to write public copies: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  lgg.info(`\nExperiment completed!`)
  lgg.info(`Results saved to: tool-capacity-results.json`)
  lgg.info(`Analysis saved to: tool-capacity-analysis.json`)

  return { results, analysis }
}

function generateSummary(results: ToolCapacityResult[]) {
  const totalRuns = results.length
  const successfulRuns = results.filter((r) => r.success).length
  const overallAccuracy = (successfulRuns / totalRuns) * 100

  return {
    totalRuns,
    successfulRuns,
    overallAccuracy: Math.round(overallAccuracy * 100) / 100,
    averageLatency: Math.round(
      results.reduce((sum, r) => sum + r.latencyMs, 0) / totalRuns
    ),
    failureTypes: getFailureTypeDistribution(results.filter((r) => !r.success)),
  }
}

function getFailureTypeDistribution(failures: ToolCapacityResult[]) {
  const distribution: Record<string, number> = {}
  failures.forEach((f) => {
    const type = f.failureType || "Unknown"
    distribution[type] = (distribution[type] || 0) + 1
  })
  return distribution
}

function analyzeResults(results: ToolCapacityResult[]) {
  const byModel = groupBy(results, "model")
  const byToolCount = groupBy(results, "toolCount")

  return {
    modelPerformance: Object.entries(byModel).map(([model, data]) => ({
      model,
      accuracy: (data.filter((r) => r.success).length / data.length) * 100,
      averageLatency:
        data.reduce((sum, r) => sum + r.latencyMs, 0) / data.length,
      totalRuns: data.length,
      selectionOnlyAccuracy:
        (data.filter((r) => r.selectionMatched).length / data.length) * 100,
    })),

    toolCountPerformance: Object.entries(byToolCount)
      .map(([toolCount, data]) => ({
        toolCount: parseInt(toolCount),
        accuracy: (data.filter((r) => r.success).length / data.length) * 100,
        averageLatency:
          data.reduce((sum, r) => sum + r.latencyMs, 0) / data.length,
        totalRuns: data.length,
        selectionOnlyAccuracy:
          (data.filter((r) => r.selectionMatched).length / data.length) * 100,
      }))
      .sort((a, b) => a.toolCount - b.toolCount),
  }
}

function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce(
    (groups, item) => {
      const group = String(item[key])
      groups[group] = groups[group] || []
      groups[group].push(item)
      return groups
    },
    {} as Record<string, T[]>
  )
}

// Run experiment if called directly (ESM-safe main check)
const isDirectRun = (() => {
  try {
    const scriptPath = process.argv[1] ? resolve(process.argv[1]) : ""
    const modulePath = resolve(fileURLToPath(import.meta.url))
    return scriptPath === modulePath
  } catch {
    return false
  }
})()

if (isDirectRun) {
  runToolCapacityExperiment().catch(console.error)
}
