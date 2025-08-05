import type { EvaluationInput } from "@workflow/ingestion/ingestion.types"
import type { CoreContext } from "./utils/config/logger"

export async function runOnceCore(
  context: CoreContext,
  input: EvaluationInput,
  setupFile?: string
) {
  const { logger } = context

  logger.info("Starting single workflow run")

  // Use the existing runOnce implementation but with injected context
  const { runOnce } = await import("./runOnce")
  return await runOnce()
}
