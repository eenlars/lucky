import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { SuggestToolPrompts } from "@core/workflow/actions/suggestTool/suggestTool.p"
import type { Workflow } from "@core/workflow/Workflow"
import { getDefaultModels } from "@core/core-config/compat"

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
  } = await sendAI({
    messages: SuggestToolPrompts.suggestNewTool({
      problemDescription: bottleneck,
      workflowDescription: workflow.toString({ easyModelNames: true }),
    }),
    model: getDefaultModels().default,
    mode: "structured",
    schema: SuggestToolPrompts.newTool,
    output: "object",
  })

  if (!success) {
    return { newTool: null, cost: 0 }
  }

  return { newTool, cost: usdCost }
}
