import { Messages } from "@messages"
import { getModels } from "@utils/config/runtimeConfig"
import { SuggestToolPrompts } from "@workflow/actions/suggestTool/suggestTool.p"
import type { Workflow } from "@workflow/Workflow"

/**
 * this function suggests a new tool after receiving a bottleneck.
 */
export async function suggestNewTool(
  workflow: Workflow,
  bottleneck: string
): Promise<{ newTool: string | null; cost: number }> {
  const {
    data: newTool,
    success,
    usdCost,
  } = await Messages.sendAI({
    messages: SuggestToolPrompts.suggestNewTool({
      problemDescription: bottleneck,
      workflowDescription: workflow.toString({ easyModelNames: true }),
    }),
    model: getModels().default,
    mode: "structured",
    schema: SuggestToolPrompts.newTool,
    output: "object",
  })

  if (!success) {
    return { newTool: null, cost: 0 }
  }

  return { newTool, cost: usdCost }
}
