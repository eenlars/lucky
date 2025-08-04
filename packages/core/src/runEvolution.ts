import { EvolutionEngine } from "@/improvement/gp/evolutionengine"
import type { FlowEvolutionMode } from "@/interfaces/runtimeConfig"
import type { EvaluationInput } from "@workflow/ingestion/ingestion.types"
import type { CoreContext } from "./interfaces"

export interface EvolutionOptions {
  mode?: FlowEvolutionMode
}

export async function runEvolution(
  context: CoreContext,
  input: EvaluationInput,
  options: EvolutionOptions = {}
) {
  const { logger } = context
  if (!options.mode) {
    throw new Error("Mode is required")
  }
  const mode = options.mode

  logger.info(`Starting evolution in ${mode} mode`)

  if (mode === "cultural") {
    // Import and run cultural evolution
    const { default: culturalMain } = await import("./main")
    return await culturalMain()
  } else {
    // TODO: Implement proper GP evolution with required parameters
    // The evolve method requires evaluator, _baseWorkflow, and problemAnalysis
    throw new Error("GP evolution not fully implemented in runEvolution. Use main.ts for complete GP evolution.")
  }
}
