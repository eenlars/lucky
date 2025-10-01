import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { experimentalModels } from "@examples/settings/models"
import { TEST_SCENARIOS, VAGUE_SYSTEM_PROMPT } from "../src/tool-real/experiments/03-context-adaptation/constants"
import { runMultiToolOurAlgorithm } from "../src/tool-real/experiments/03-context-adaptation/our-algorithm-helper-runner"
import { adaptiveTools } from "../src/tool-real/shared/tools/adaptive/adaptiveTools"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function main() {
  const model = experimentalModels.gpt35turbo.id
  const scenario = TEST_SCENARIOS.find(s => s.id === "basic-failure")!

  console.log(`[our-algorithm-once] Model: ${model}`)
  console.log(`[our-algorithm-once] Scenario: ${scenario.id}`)
  console.log(`[our-algorithm-once] Condition: VAGUE`)

  const res = await runMultiToolOurAlgorithm(model as any, scenario.prompt, adaptiveTools, VAGUE_SYSTEM_PROMPT, {})

  const toolExecs = res.toolExecutions
  const fetchCalls = toolExecs.filter(t => t.toolName === "fetch_objects")
  const successItems = fetchCalls
    .filter(c => Array.isArray(c.outputData))
    .reduce((n, c) => n + ((c.outputData as any[])?.length || 0), 0)

  console.log(`[our-algorithm-once] fetch calls: ${fetchCalls.length}`)
  console.log(`[our-algorithm-once] items: ${successItems}/${scenario.expected}`)
  console.log(`[our-algorithm-once] adapted: ${successItems >= scenario.expected}`)
  console.log(`[our-algorithm-once] tool calls:`)
  for (const e of toolExecs) {
    console.log(
      `- ${e.toolName} args=${JSON.stringify(e.inputData)} retType=${Array.isArray(e.outputData) ? "array" : typeof e.outputData}`,
    )
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
