import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { experimentalModels } from "../../../runtime/settings/models"
import {
  CLEAR_SYSTEM_PROMPT,
  TEST_SCENARIOS,
  VAGUE_SYSTEM_PROMPT,
} from "../src/tool-real/experiments/03-context-adaptation/constants"
import type { Condition } from "../src/tool-real/experiments/03-context-adaptation/types"
import { runMultiToolOurAlgorithm } from "../src/tool-real/experiments/03-context-adaptation/our-algorithm-helper-runner"
import { adaptiveTools } from "../src/tool-real/shared/tools/adaptive/adaptiveTools"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DEFAULT_MODELS: string[] = [
  experimentalModels.gpt41mini.id, // openai/gpt-4.1-mini
]

async function runOnce(model: string, condition: Condition) {
  const scenario = TEST_SCENARIOS.find((s) => s.id === "basic-failure")!
  const sys = condition === "vague" ? VAGUE_SYSTEM_PROMPT : CLEAR_SYSTEM_PROMPT

  console.log("".padEnd(60, "="))
  console.log(`Model: ${model}`)
  console.log(`Condition: ${condition.toUpperCase()}`)
  console.log(`Scenario: ${scenario.id}`)
  console.log(`Request: ${scenario.prompt}`)

  const result = await runMultiToolOurAlgorithm(
    model as any,
    scenario.prompt,
    adaptiveTools,
    sys,
    {}
  )

  const toolExecs = result.toolExecutions
  const fetchCalls = toolExecs.filter((t) => t.toolName === "fetch_objects")
  const successItems = fetchCalls
    .filter((c) => Array.isArray(c.outputData))
    .reduce((n, c) => n + ((c.outputData as any[])?.length || 0), 0)

  console.log("- Tool calls:")
  for (const e of toolExecs) {
    const retType = Array.isArray(e.outputData) ? "array" : typeof e.outputData
    console.log(
      `  • ${e.toolName} args=${JSON.stringify(e.inputData)} retType=${retType}`
    )
  }

  console.log(`- Items fetched: ${successItems}/${scenario.expected}`)
  console.log(`- Adapted: ${successItems >= scenario.expected}`)
  console.log(`- Success flag: ${result.success}`)
  console.log(
    `- Total cost (USD): ${Number(result.totalCostUsd || 0).toFixed(4)}`
  )
  console.log(`- Debug prompts: ${result.debugPrompts?.length ?? 0}`)
}

async function main() {
  for (const model of DEFAULT_MODELS) {
    await runOnce(model, "vague")
    await runOnce(model, "clear")
    await new Promise((r) => setTimeout(r, 300))
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
