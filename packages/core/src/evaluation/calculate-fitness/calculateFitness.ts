import { CONFIG } from "@core/core-config/compat"
import { getDefaultModels } from "@core/core-config/compat"
import {
  type FitnessFunctionInput,
  type FitnessOfWorkflow,
  FitnessOfWorkflowSchema,
} from "@core/evaluation/calculate-fitness/fitness.types"
import { normalizeCost, normalizeTime } from "@core/evaluation/calculate-fitness/fitnessNormalize"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { toolUsageToString } from "@core/messages/pipeline/agentStepLoop/utils"
import { fitnessSystemPrompt, fitnessUserPrompt } from "@core/prompts/evaluator/fitness/fitnessPrompt"
import { llmify } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { R, type RS } from "@core/utils/types"
import { zodToJson } from "@core/utils/zod/zodToJson"
import { isNir } from "@lucky/shared"

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
    // Gracefully handle missing outputs by assigning zero fitness without invoking AI
    return R.success(
      {
        score: 0,
        totalCostUsd: totalCost,
        totalTimeSeconds: totalTime / 1000,
        accuracy: 0,
      },
      0,
    )
  }

  const outputSchemaStr: string | undefined = outputSchema ? zodToJson(outputSchema) : undefined

  const outputStr = `${toolUsageToString(agentSteps)}\n\n${finalWorkflowOutput}`

  const systemPrompt = fitnessSystemPrompt({
    groundTruth: evaluation,
    rubric,
  })
  const userPrompt = fitnessUserPrompt({
    outputStr,
    outputSchemaStr,
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
    response.usdCost,
  )
}

export const privateCalculateFitness = calculateFitness
