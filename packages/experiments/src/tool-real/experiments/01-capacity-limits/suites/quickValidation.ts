/**
 * Quick validation suite - test one model with minimal tool counts to verify setup
 */
import { lgg } from "@core/utils/logging/Logger"
import type { OpenRouterModelName } from "@core/utils/spending/models.types"
import { experimentalModels } from "../../../../../../../examples/settings/models"
import { evaluate } from "../evaluation"
import { allToolSpecs, chatWithTools } from "../openaiRunner"
import { prompts } from "../prompts"

export async function quickValidationSuite() {
  const model: OpenRouterModelName =
    (experimentalModels.gpt35turbo.id as OpenRouterModelName) ??
    (experimentalModels.gpt41nano.id as OpenRouterModelName)
  const toolCounts = [4, 8] // Just two tool counts for quick test
  const testPrompts = prompts.slice(0, 2) // Just first 2 prompts

  lgg.info("Running quick validation suite...")
  lgg.info(`Model: ${model}`)
  lgg.info(`Tool counts: ${toolCounts.join(", ")}`)
  lgg.info(`Prompts: ${testPrompts.length}`)

  for (const toolCount of toolCounts) {
    lgg.info(`\nTesting with ${toolCount} tools`)

    const toolNames = Object.keys(allToolSpecs)
    const realToolNames = toolNames.slice(0, 4)
    const fillerToolNames = toolNames.slice(4, toolCount)
    const selectedToolNames = [...realToolNames, ...fillerToolNames]
    const tools: Record<string, unknown> = Object.fromEntries(
      selectedToolNames.map((name) => [
        name,
        allToolSpecs[name as keyof typeof allToolSpecs],
      ])
    )

    for (const prompt of testPrompts) {
      const startTime = Date.now()

      try {
        const trace = await chatWithTools(model, prompt.content, tools as any)
        const latencyMs = Date.now() - startTime
        const evaluation = await evaluate(trace as any, prompt.expects.tool)
        const selectedTool =
          trace.toolCalls[trace.toolCalls.length - 1]?.toolName

        const status = evaluation.success ? "✓" : "✗"
        const base = `${prompt.id}: ${status} (${latencyMs}ms, selected: ${selectedTool || "none"})`
        if (!evaluation.success) {
          lgg.info(`${base} -> ${evaluation.details}`)
          if (evaluation.failureType)
            lgg.info(`Type: ${evaluation.failureType}`)
        } else {
          lgg.info(base)
        }
      } catch (error) {
        lgg.error(
          `${prompt.id}: ERROR - ${error instanceof Error ? error.message : String(error)}`
        )
      }

      // Small delay between calls
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  lgg.info("\nQuick validation completed!")
}

if (require.main === module) {
  quickValidationSuite().catch(console.error)
}
