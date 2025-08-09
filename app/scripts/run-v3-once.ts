import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { experimentalModels } from "../../runtime/settings/models"
import {
  TEST_SCENARIOS,
  VAGUE_SYSTEM_PROMPT,
} from "../src/research-experiments/tool-real/experiments/03-context-adaptation/constants"
import { runMultiToolV3 } from "../src/research-experiments/tool-real/experiments/03-context-adaptation/v3helper-runner"
import { adaptiveTools } from "../src/research-experiments/tool-real/shared/tools/adaptive/adaptiveTools"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  const model = experimentalModels.gpt35turbo.id
  const scenario = TEST_SCENARIOS.find((s) => s.id === "basic-failure")!

  console.log(`[v3-once] Model: ${model}`)
  console.log(`[v3-once] Scenario: ${scenario.id}`)
  console.log(`[v3-once] Condition: VAGUE`)

  const res = await runMultiToolV3(
    model as any,
    scenario.prompt,
    adaptiveTools,
    VAGUE_SYSTEM_PROMPT,
    {}
  )

  const toolExecs = res.toolExecutions
  const fetchCalls = toolExecs.filter((t) => t.toolName === "fetch_objects")
  const successItems = fetchCalls
    .filter((c) => Array.isArray(c.outputData))
    .reduce((n, c) => n + ((c.outputData as any[])?.length || 0), 0)

  console.log(`[v3-once] fetch calls: ${fetchCalls.length}`)
  console.log(`[v3-once] items: ${successItems}/${scenario.expected}`)
  console.log(`[v3-once] adapted: ${successItems >= scenario.expected}`)
  console.log(`[v3-once] tool calls:`)
  for (const e of toolExecs) {
    console.log(
      `- ${e.toolName} args=${JSON.stringify(e.inputData)} retType=${Array.isArray(e.outputData) ? "array" : typeof e.outputData}`
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
