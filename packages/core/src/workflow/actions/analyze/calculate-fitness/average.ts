import { sendAI } from "@messages/api/sendAI"
import { truncater } from "@utils/common/llmify"
import { R, type RS } from "@utils/types"
import { guard } from "@workflow/schema/errorMessages"
import { getModels } from "@utils/config/runtimeConfig"
import type { FitnessOfWorkflow } from "./fitness.types"

export const calculateAverageFitness = (
  fitnesses: FitnessOfWorkflow[]
): FitnessOfWorkflow => {
  if (!fitnesses || fitnesses.length === 0) {
    throw new Error("No fitnesses to average")
  }

  const count = fitnesses.length

  let totalScore = 0
  let totalCostUsd = 0
  let totalTimeSeconds = 0
  let totalAccuracy = 0
  let totalNovelty = 0

  for (const fitness of fitnesses) {
    totalScore += fitness.score
    totalCostUsd += fitness.totalCostUsd
    totalTimeSeconds += fitness.totalTimeSeconds
    totalAccuracy += fitness.accuracy
    totalNovelty += fitness.novelty
  }

  return {
    score: totalScore / count,
    totalCostUsd: totalCostUsd / count,
    totalTimeSeconds: totalTimeSeconds / count,
    accuracy: totalAccuracy / count,
    novelty: totalNovelty / count,
  }
}

export const calculateAverageFeedback = async (
  feedbacks: string[]
): Promise<RS<string>> => {
  guard(feedbacks, "No feedbacks to average")

  // If only one feedback, return it directly
  if (feedbacks.length === 1) {
    return {
      success: true,
      data: feedbacks[0],
      usdCost: 0,
    }
  }

  const feedbacksString = feedbacks
    .map((feedback, index) => `Feedback ${index + 1}:\n${feedback}`)
    .join("\n\n")

  // Use AI to synthesize common themes from multiple feedbacks
  const prompt = `
  Analyze the following feedback entries and synthesize them:

${truncater(feedbacksString, 12000)}

Please provide a synthesized feedback that:
- Identifies the most common issues or patterns
- Combines recurring themes and recommendations
- Maintains the analytical depth of the original feedbacks
- Provides actionable insights based on the collective feedback
`

  const result = await sendAI({
    messages: [{ role: "user", content: prompt }],
    model: getModels().medium,
    mode: "text",
  })

  if (!result.success || !result.data) {
    return R.error(
      `Failed to synthesize feedback: ${JSON.stringify(result)}`,
      result.usdCost
    )
  }

  return {
    success: true,
    data: result.data.text,
    usdCost: result.usdCost,
  }
}
