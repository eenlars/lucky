import { getDefaultModels } from "@core/core-config/compat"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { groupedFeedback } from "@core/prompts/evaluator/feedback/averageFeedback.p"
import { R, type RS } from "@core/utils/types"
import { guard } from "@core/workflow/schema/errorMessages"
import type { FitnessOfWorkflow } from "./fitness.types"

export const calculateAverageFitness = (fitnesses: FitnessOfWorkflow[]): FitnessOfWorkflow => {
  if (!fitnesses || fitnesses.length === 0) {
    throw new Error("No fitnesses to average")
  }

  const count = fitnesses.length

  let totalScore = 0
  let totalCostUsd = 0
  let totalTimeSeconds = 0
  let totalAccuracy = 0

  for (const fitness of fitnesses) {
    totalScore += fitness.score
    totalCostUsd += fitness.totalCostUsd
    totalTimeSeconds += fitness.totalTimeSeconds
    totalAccuracy += fitness.accuracy
  }

  return {
    score: totalScore / count,
    totalCostUsd: totalCostUsd / count,
    totalTimeSeconds: totalTimeSeconds / count,
    accuracy: totalAccuracy / count,
  }
}

export const calculateFeedbackGrouped = async (feedbacks: string[]): Promise<RS<string>> => {
  guard(feedbacks, "No feedbacks to average")

  // If only one feedback, return it directly
  if (feedbacks.length === 1) {
    return {
      success: true,
      data: feedbacks[0],
      usdCost: 0,
    }
  }

  const feedbacksString = feedbacks.map((feedback, index) => `Feedback ${index + 1}:\n${feedback}`).join("\n\n")

  // Use AI to synthesize the feedback.
  const prompt = groupedFeedback(feedbacksString)

  const result = await sendAI({
    messages: [{ role: "user", content: prompt }],
    model: getDefaultModels().medium,
    mode: "text",
  })

  if (!result.success || !result.data) {
    return R.error(`Failed to synthesize feedback: ${JSON.stringify(result)}`, result.usdCost)
  }

  return {
    success: true,
    data: result.data.text,
    usdCost: result.usdCost,
  }
}
