import type {
  FitnessFunctionInput,
  FitnessOfWorkflow,
} from "@core/evaluation/calculate-fitness/fitness.types"
import { R, type RS } from "@core/utils/types"
import { getDefaultModels } from "@runtime/settings/models"
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
  rounds: number = 5
): Promise<RS<FitnessOfWorkflow>> {
  const models = [
    getDefaultModels().fitness,
    getDefaultModels().high,
    getDefaultModels().reasoning,
  ]
    // de-duplicate in case multiple keys map to same underlying model id
    .filter((value, index, self) => self.indexOf(value) === index)

  const results: FitnessOfWorkflow[] = []
  let totalUsdCost = 0

  for (const model of models) {
    for (let i = 0; i < rounds; i++) {
      const res = await baseCalculateFitness({ ...input, overrideModel: model })
      totalUsdCost += res.usdCost ?? 0
      if (res.success) {
        results.push(res.data)
      }
    }
  }

  if (results.length === 0) {
    return R.error("Failed to calculate fitness in all rounds", totalUsdCost)
  }

  const averaged = calculateAverageFitness(results)
  return R.success(averaged, totalUsdCost)
}
