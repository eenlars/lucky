import { type FitnessFunctionInput } from "@core/evaluation/calculate-fitness/fitness.types"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { toolUsageToString } from "@core/messages/pipeline/agentStepLoop/utils"
import { singleFeedbackSystemPrompt, singleFeedbackUserPrompt } from "@core/prompts/evaluator/feedback/singleFeedback.p"
import { isNir } from "@core/utils/common/isNir"
import { llmify } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { R, type RS } from "@core/utils/types"
import { getDefaultModels } from "@core/core-config/compat"

export async function calculateFeedback({
  agentSteps,
  evaluation,
}: Omit<FitnessFunctionInput, "totalTime" | "totalCost" | "finalWorkflowOutput">): Promise<RS<string>> {
  if (isNir(agentSteps)) {
    lgg.warn("No outputs found")
    // Gracefully handle missing outputs by returning default feedback
    return R.success("No outputs produced by the workflow run, skipping feedback.", 0)
  }
  const outputStr = toolUsageToString(agentSteps, 1000, {
    includeArgs: false,
  })

  const useReasoning = true

  const systemPrompt = singleFeedbackSystemPrompt(evaluation, outputStr, useReasoning)
  const userPrompt = singleFeedbackUserPrompt(outputStr)

  const response = await sendAI({
    messages: [
      { role: "system", content: llmify(systemPrompt) },
      { role: "user", content: llmify(userPrompt) },
    ],
    model: useReasoning ? getDefaultModels().reasoning : getDefaultModels().fitness,
    mode: "text",
    opts: {
      reasoning: useReasoning,
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
