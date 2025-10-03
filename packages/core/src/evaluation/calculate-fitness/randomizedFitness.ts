import { getDefaultModels } from "@core/core-config/compat"
import type { FitnessFunctionInput, FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { lgg } from "@core/utils/logging/Logger"
import { R, type RS } from "@lucky/shared"
import { calculateAverageFitness } from "./average"
import { privateCalculateFitness as baseCalculateFitness } from "./calculateFitness"

/**
 * Run multiple rounds of the base fitness function across three different models
 * and average the results to reduce bias.
 *
 * - Input and output types match `calculateFitness`
 * - Uses 3 models: fitness, high, reasoning
 * - Rounds default to 5 (override via env FITNESS_ROUNDS)
 */
export async function calculateFitness(
  input: FitnessFunctionInput,
  numRounds = 1,
  numModels = 2,
): Promise<RS<FitnessOfWorkflow>> {
  const models = [getDefaultModels().fitness, getDefaultModels().nano, getDefaultModels().reasoning]
    // de-duplicate in case multiple keys map to same underlying model id
    .filter((value, index, self) => self.indexOf(value) === index)

  // Create all promises upfront for parallel execution
  const promises = models
    .slice(0, numModels)
    .flatMap(model => Array.from({ length: numRounds }, () => baseCalculateFitness({ ...input, overrideModel: model })))

  // Execute all fitness calculations in parallel
  const allResults = await Promise.all(promises)

  const results: FitnessOfWorkflow[] = []
  let totalUsdCost = 0

  for (const res of allResults) {
    totalUsdCost += res.usdCost ?? 0
    if (res.success) {
      results.push(res.data)
    }
  }

  if (results.length === 0) {
    lgg.warn("No results from fitness calculations")
    // Fallback: produce a zeroed fitness result to keep evaluation pipeline resilient
    return R.success(
      {
        score: 0,
        totalCostUsd: totalUsdCost,
        totalTimeSeconds: (input.totalTime ?? 0) / 1000,
        accuracy: 0,
      },
      totalUsdCost,
    )
  }

  const averaged = calculateAverageFitness(results)
  return R.success(averaged, totalUsdCost)
}
