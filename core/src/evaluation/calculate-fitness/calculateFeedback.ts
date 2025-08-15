import { type FitnessFunctionInput } from "@core/evaluation/calculate-fitness/fitness.types"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import {
  singleFeedbackSystemPrompt,
  singleFeedbackUserPrompt,
} from "@core/prompts/root-cause/singleFeedback.p"
import { isNir } from "@core/utils/common/isNir"
import { llmify } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { R, type RS } from "@core/utils/types"
import { getDefaultModels } from "@runtime/settings/models"

export async function calculateFeedback({
  agentSteps,
  evaluation,
}: Omit<
  FitnessFunctionInput,
  "totalTime" | "totalCost" | "finalWorkflowOutput"
>): Promise<RS<string>> {
  if (isNir(agentSteps)) {
    lgg.warn("No outputs found")
    return R.error("No outputs to evaluate", 0)
  }
  const outputStr = llmify(JSON.stringify(agentSteps))

  const systemPrompt = singleFeedbackSystemPrompt(evaluation, outputStr)
  const userPrompt = singleFeedbackUserPrompt(outputStr)

  const response = await sendAI({
    messages: [
      { role: "system", content: llmify(systemPrompt) },
      { role: "user", content: llmify(userPrompt) },
    ],
    model: getDefaultModels().fitness,
    mode: "text",
    opts: {
      reasoning: false,
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
