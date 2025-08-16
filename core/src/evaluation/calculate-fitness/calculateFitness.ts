import {
  FitnessOfWorkflowSchema,
  type FitnessFunctionInput,
  type FitnessOfWorkflow,
} from "@core/evaluation/calculate-fitness/fitness.types"
import {
  normalizeCost,
  normalizeTime,
} from "@core/evaluation/calculate-fitness/fitnessNormalize"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import {
  fitnessSystemPrompt,
  fitnessUserPrompt,
} from "@core/prompts/evaluator/fitness/fitnessPrompt"
import { isNir } from "@core/utils/common/isNir"
import { llmify } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { R, type RS } from "@core/utils/types"
import { zodToJson } from "@core/utils/zod/zodToJson"
import { CONFIG } from "@runtime/settings/constants"
import { getDefaultModels } from "@runtime/settings/models"

async function calculateFitness({
  agentSteps,
  totalTime,
  totalCost,
  evaluation,
  outputSchema,
  finalWorkflowOutput,
  overrideModel,
  rubric,
}: FitnessFunctionInput): Promise<RS<FitnessOfWorkflow>> {
  if (isNir(agentSteps) || isNir(finalWorkflowOutput)) {
    lgg.warn("No outputs found")
    return R.error("No outputs to evaluate", 0)
  }

  const eutputSchemaStr: string | undefined = outputSchema
    ? zodToJson(outputSchema)
    : undefined

  const outputStr =
    llmify(JSON.stringify(agentSteps)) + "\n\n" + finalWorkflowOutput

  const systemPrompt = fitnessSystemPrompt({
    groundTruth: evaluation,
    rubric,
  })
  const userPrompt = fitnessUserPrompt({
    outputStr,
    eutputSchemaStr,
  })
  const response = await sendAI({
    messages: [
      { role: "system", content: llmify(systemPrompt) },
      { role: "user", content: llmify(userPrompt) },
    ],
    model: overrideModel || getDefaultModels().fitness,
    mode: "structured",
    schema: FitnessOfWorkflowSchema,
    opts: {
      reasoning: true,
    },
  })

  console.log("response", response)

  if (!response.success) {
    return R.error(response.error, response.usdCost)
  }

  // Ensure we have valid values with fallbacks
  // Allow 0 for completely wrong outputs
  const accuracy = Math.max(0, Math.min(100, response.data.accuracy ?? 0))

  const effectiveScore = accuracy

  const normalizedTime = normalizeTime(totalTime)
  const normalizedCost = normalizeCost(response.usdCost)

  // Gate time/cost bonuses by accuracy - failed workflows shouldn't get efficiency rewards
  // When accuracy is 0, no bonus should be applied
  const accuracyGate = Math.max(0, accuracy / 100)
  const gatedTimeBonus = normalizedTime * accuracyGate
  const gatedCostBonus = normalizedCost * accuracyGate

  const finalFitness =
    effectiveScore * CONFIG.improvement.fitness.weights.score +
    gatedTimeBonus * CONFIG.improvement.fitness.weights.time +
    gatedCostBonus * CONFIG.improvement.fitness.weights.cost

  // Cap at 100 to allow promising workflows higher scores
  const cappedFinalScore = Math.min(100, Math.round(finalFitness))

  // Return with original time & cost - everything is now in the feedback string
  return R.success(
    {
      score: cappedFinalScore,
      totalCostUsd: totalCost + response.usdCost,
      totalTimeSeconds: totalTime / 1000,
      accuracy: Math.round(accuracy),
    },
    response.usdCost
  )
}

export const privateCalculateFitness = calculateFitness
