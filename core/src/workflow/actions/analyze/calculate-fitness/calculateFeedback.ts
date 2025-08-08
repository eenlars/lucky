import { sendAI } from "@core/messages/api/sendAI"
import { rcaPrompt } from "@core/prompts/rca"
import { isNir } from "@core/utils/common/isNir"
import { llmify } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { R, type RS } from "@core/utils/types"
import {
  feedbackPrompt,
  type FitnessFunctionInput,
} from "@core/workflow/actions/analyze/calculate-fitness/fitness.types"
import { getDefaultModels } from "@runtime/settings/models"

export async function calculateFeedback({
  nodeOutputs,
  evaluation,
}: Omit<
  FitnessFunctionInput,
  "totalTime" | "totalCost" | "finalWorkflowOutput"
>): Promise<RS<string>> {
  if (isNir(nodeOutputs)) {
    lgg.warn("No outputs found")
    return R.error("No outputs to evaluate", 0)
  }
  const outputStr = llmify(JSON.stringify(nodeOutputs))
  const systemPrompt = `.
    ${rcaPrompt}

    # ground truth
    Ground Truth Solution:
    ${evaluation}

    # response output
    - Respond with JSON: { "feedback": ${feedbackPrompt}}
    - In your feedback, include the required elements as specified.
`
  const userPrompt = `
Workflow Final Output:
<output>
${outputStr}
</output>

Evaluate how well the workflow's final output matches the expected ground truth solution, considering the evaluation criteria above.
if not good, you need to give examples why it's not good.

VERY IMPORTANT!!! : the feedback may NEVER include the answer, or parts of the answer to the question. if it does, it will be rejected.
You may include the original question in the feedback, but you have to note that this is a general question for this workflow, and it may not generalize for the netire workflow.
`
  const response = await sendAI({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    model: getDefaultModels().fitness,
    mode: "text",
    opts: {
      reasoning: true,
    },
  })

  if (!response.success || !response.data) {
    return R.error(response.error, response.usdCost)
  }

  // const guard = await llmGuard(
  //   response.data.text,
  //   `the text may NEVER include the answer, or parts of the answer to the question. if it does, it will be rejected. the answer is: ${evaluation}`
  // )
  // if (!guard.isValid) {
  //   return R.error(`LLM Feedback Guard failed: ${guard.reason}`, response.usdCost)
  // }
  console.log("response.data.text", response.data.text)

  return R.success(response.data.text, response.usdCost)
}
