/**
 * runAdaptiveTest.our-algorithm.ts - Sanity test using MultiStep our-algorithm on the hidden-constraint scenarios
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
// OpenRouterModelName is re-exported via constants consumers; keep import removed to avoid unused var

import { adaptiveTools } from "../../../shared/tools/adaptive/adaptiveTools"
import type { ToolExecution } from "../../02-sequential-chains/types"
import { scoreLoop } from "../analyze/scoreRun"
import {
  CLEAR_SYSTEM_PROMPT as CLEAR,
  MODELS_OUR_ALGORITHM as MODELS,
  TEST_SCENARIOS as SCENARIOS,
  VAGUE_SYSTEM_PROMPT as VAGUE,
} from "../constants"
import { runMultiToolOurAlgorithm } from "../our-algorithm-helper-runner"
import type { LearningEffects, OurAlgorithmExperimentResults, OurAlgorithmLoop, OurAlgorithmRun } from "../types"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// MODELS, prompts, and scenarios centralized in ./constants

async function runSanityOurAlgorithm() {
  // Ensure results directory exists
  const resultsDir = join(__dirname, "results")
  mkdirSync(resultsDir, { recursive: true })

  const runs: OurAlgorithmRun[] = []
  for (const model of MODELS) {
    for (const scenario of SCENARIOS) {
      for (const cond of ["vague", "clear"] as const) {
        const sys = cond === "vague" ? VAGUE : CLEAR
        // Run 3 multi-step loops, accumulating memory between rounds
        let memory: Record<string, string> = {}
        const loops: OurAlgorithmLoop[] = []
        for (let loop = 1; loop <= 3; loop++) {
          const t0 = Date.now()
          const res = await withQuietLogs(() =>
            runMultiToolOurAlgorithm(model, scenario.prompt, adaptiveTools, sys, memory),
          )
          const durationMs = Date.now() - t0
          const metrics = scoreLoop(
            res.toolExecutions as ToolExecution[],
            scenario.expected,
            res.toolUsageOutputs || [],
          )
          loops.push({
            loop,
            success: res.success,
            cost: res.totalCostUsd,
            durationMs,
            updatedMemory: res.updatedMemory ?? null,
            learnings: res.learnings ?? null,
            toolExecutions: res.toolExecutions,
            metrics,
          })
          if (res.updatedMemory) memory = { ...memory, ...res.updatedMemory }
        }

        // Evaluate based on the final loop tool executions
        const finalExecs = loops[loops.length - 1].toolExecutions
        const fetchCalls = finalExecs.filter(c => c.toolName === "fetch_objects")
        const successItems = fetchCalls
          .filter(c => Array.isArray(c.outputData as any))
          .reduce((n, c) => n + (Array.isArray(c.outputData as any) ? (c.outputData as any[]).length : 0), 0)

        const adapted = successItems >= scenario.expected
        runs.push({
          model,
          scenario: scenario.id,
          condition: cond,
          adapted,
          totalFetchCalls: fetchCalls.length,
          successItems,
          success: loops[loops.length - 1].success,
          cost: loops.reduce((s, l) => s + (l.cost || 0), 0),
          durationMs: loops.reduce((s, l) => s + (l.durationMs || 0), 0),
          loops,
          learningEffects: computeLearningEffects(loops),
        })
        console.log(
          `${model} ${scenario.id} ${cond}: calls=${fetchCalls.length}, items=${successItems}/${scenario.expected}, adapted=${adapted}`,
        )
        await new Promise(r => setTimeout(r, 150))
      }
    }
  }

  const now = new Date()
  const hh = String(now.getHours()).padStart(2, "0")
  const mm = String(now.getMinutes()).padStart(2, "0")
  const out = join(resultsDir, `adaptive-results.our-algorithm-${hh}${mm}.json`)
  const payload: OurAlgorithmExperimentResults = {
    timestamp: new Date().toISOString(),
    runs,
  }
  writeFileSync(out, JSON.stringify(payload, null, 2))
  console.log(`Saved: ${out}`)

  // Also write a public copy with a fixed filename
  try {
    const publicDir = join(process.cwd(), "public/research-experiments/tool-real/experiments/03-context-adaptation")
    mkdirSync(publicDir, { recursive: true })
    const fixed = join(publicDir, "adaptive-results.our-algorithm.json")
    writeFileSync(fixed, JSON.stringify(payload, null, 2))
    console.log(`Public our-algorithm copy saved: ${fixed}`)
  } catch (err) {
    console.warn(
      `Failed to write public adaptive our-algorithm copy: ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSanityOurAlgorithm().catch(console.error)
}

// Quiet noisy internal logs for cleaner experiment output
function withQuietLogs<T>(fn: () => Promise<T> | T): Promise<T> | T {
  const originalLog = console.log
  const originalError = console.error
  try {
    console.log = (...args: any[]) => {
      const text = args.map(String).join(" ")
      if (text.includes("decision:") || text.includes("[InvocationPipeline]") || text.includes("save msg failed")) {
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

// per-loop metrics now unified in analyze/scoreRun.scoreLoop

function computeLearningEffects(loops: OurAlgorithmLoop[]): LearningEffects | null {
  if (!loops?.length) return null
  const l1 = loops[0]?.metrics
  const l3 = loops[loops.length - 1]?.metrics
  if (!l1 || !l3) return null
  return {
    deltaAdapted: Number(l3.adapted) - Number(l1.adapted),
    deltaFetchCalls: (l3.fetchCallsCount ?? 0) - (l1.fetchCallsCount ?? 0),
    deltaErrorRate: (l3.errorRate ?? 0) - (l1.errorRate ?? 0),
    deltaAdherence: (l3.adherenceToLimit ?? 0) - (l1.adherenceToLimit ?? 0),
    optimalSplitAdopted: l1.strategy !== "optimal-split" && l3.strategy === "optimal-split",
    memoryGrowth:
      (Object.keys(loops[loops.length - 1]?.updatedMemory || {}).length || 0) -
      (Object.keys(loops[0]?.updatedMemory || {}).length || 0),
  }
}
