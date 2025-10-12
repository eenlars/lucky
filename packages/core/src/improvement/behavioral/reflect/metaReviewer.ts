import { getDefaultModels } from "@core/core-config/coreConfig"
import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { FitnessOfWorkflowSchema } from "@core/evaluation/calculate-fitness/fitness.types"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { llmify } from "@core/utils/common/llmify"
import type { OutputSchema } from "@core/workflow/ingestion/ingestion.types"
import { JSONN } from "@lucky/shared"
import { R, type RS } from "@lucky/shared"

/**
 * Evaluates the quality of a critique by comparing it to the meta agent's assessment
 * This is used to score how well the critic workflow performs
 */
export const evaluateCritiqueQuality = async ({
  originalOutput,
  criticWorkflowOutput,
  metaAgentFeedback,
  totalTime,
  totalCost,
  evaluation,
  expectedOutputTypeOfWorkflow: _expectedOutputTypeOfWorkflow,
}: {
  originalOutput: any
  criticWorkflowOutput: any
  metaAgentFeedback: string
  totalTime: number
  totalCost: number
  evaluation: string
  expectedOutputTypeOfWorkflow?: OutputSchema
}): Promise<RS<FitnessOfWorkflow>> => {
  const critique = criticWorkflowOutput

  const systemPrompt = `
You are an expert evaluator for critique quality assessment.

# accuracy
Accuracy 1-100: 
- How well the critique identifies real issues, provides constructive feedback, and aligns with expert assessment. 
- Give partial credit: if 2/4 of the expected criteria are met, give 50% credit.
- If there is no good answer, give 0% credit.

# criteria
- Issue identification (40%)
- Feedback quality (30%)
- Expert alignment (20%)
- Improvement suggestions (10%)

# meta agent assessment
Meta Agent Assessment:
${metaAgentFeedback}

# original output
Original Output:
${typeof originalOutput === "string" ? originalOutput : llmify(JSONN.show(originalOutput))}

Ground Truth: ${evaluation}

Respond with JSON: {"accuracy": 1-100, "feedback": "comprehensive analysis"}

In your feedback, include: critique quality justification, specific weaknesses and strengths of the critique (bullet points), 2-3 improvement suggestions with priorities, and estimated impact (potential improvement 0-100, cost change decrease/increase/neutral).
  `

  const response = await sendAI({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: critique },
    ],
    model: getDefaultModels().fitness,
    mode: "structured",
    schema: FitnessOfWorkflowSchema,
    opts: {
      reasoning: true,
    },
  })

  if (!response.success) {
    return R.error(response.error, response.usdCost)
  }

  return R.success(
    {
      score: response.data.accuracy,
      totalCostUsd: totalCost + response.usdCost,
      totalTimeSeconds: totalTime / 1000,
      accuracy: response.data.accuracy,
    },
    response.usdCost,
  )
}
