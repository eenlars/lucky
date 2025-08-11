// app/src/core/invocation/invokeWorkflow.ts

import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { isNir } from "@core/utils/common/isNir"
import { genShortId } from "@core/utils/common/utils"
import { lgg } from "@core/utils/logging/Logger"
import { SpendingTracker } from "@core/utils/spending/SpendingTracker"
import { R, type RS } from "@core/utils/types"
import {
  needsEvaluation,
  type EvaluationInput,
} from "@core/workflow/ingestion/ingestion.types"
import type { RunResult } from "@core/workflow/runner/runAllInputs"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import {
  loadFromDatabase,
  loadFromDSL,
  loadFromFile,
} from "@core/workflow/setup/WorkflowLoader"
import { Workflow } from "@core/workflow/Workflow"
import { CONFIG } from "@runtime/settings/constants"
import { JSONN } from "@shared/utils/files/json/jsonParse"

export type InvocationInput = {
  evalInput: EvaluationInput
} & (
  | { workflowVersionId: string; filename?: never; dslConfig?: never }
  | { filename: string; workflowVersionId?: never; dslConfig?: never }
  | { dslConfig: WorkflowConfig; workflowVersionId?: never; filename?: never }
)

export type InvokeWorkflowResult = RunResult & {
  fitness?: FitnessOfWorkflow
  feedback?: string
  usdCost?: number
  outputMessage?: string
}

export async function invokeWorkflow(
  input: InvocationInput
): Promise<RS<InvokeWorkflowResult[]>> {
  try {
    const { evalInput } = input

    if (isNir(evalInput)) {
      lgg.error("evalInput is null/undefined", evalInput)
      throw new Error("evalInput is null/undefined")
    }

    // Set defaults
    evalInput.workflowId ??= "ad-hoc-" + genShortId()
    if (evalInput.type === "text" && !evalInput.answer) {
      evalInput.answer = ""
    }

    let config: WorkflowConfig

    if ("workflowVersionId" in input && input.workflowVersionId) {
      config = await loadFromDatabase(input.workflowVersionId)
    } else if ("filename" in input && input.filename) {
      config = await loadFromFile(input.filename)
    } else if ("dslConfig" in input && input.dslConfig) {
      config = await loadFromDSL(input.dslConfig)
    } else {
      throw new Error(
        "Either workflowVersionId, filename, or dslConfig must be provided"
      )
    }

    // Initialize spending tracker if enabled
    if (CONFIG.limits.enableSpendingLimits) {
      SpendingTracker.getInstance().initialize(CONFIG.limits.maxCostUsdPerRun)
    }

    // Create workflow
    const workflow = Workflow.create({
      config: config,
      evaluationInput: evalInput,
      toolContext: undefined,
      // No parentVersionId or evolutionContext for ad-hoc invocation
    })

    // Set workflow IO (handles multiple inputs via IngestionLayer)
    await workflow.prepareWorkflow(
      evalInput,
      CONFIG.workflow.prepareProblemMethod
    )

    const { success, error, data: runResults, usdCost } = await workflow.run()

    if (!runResults || !success) {
      return R.error(error || "Unknown error", 0)
    }

    if (runResults) {
      lgg.log(
        "Run results",
        JSONN.show(runResults.map((r) => r.queueRunResult.finalWorkflowOutput))
      )
    }

    // Check if we need to evaluate (when there's something to compare against)
    if (needsEvaluation(evalInput)) {
      // Evaluate the results to calculate fitness and save to database
      const {
        success,
        error,
        data: evaluationResult,
      } = await workflow.evaluate()
      if (!success) {
        lgg.error(
          `[InvokeWorkflow] Evaluation failed for workflow ${workflow.getWorkflowVersionId()}: ${error}`
        )
        return R.error(error, 0)
      }

      // Return all evaluation results with fitness and feedback
      const resultsWithEvaluation = runResults.map(
        (runResult: RunResult, index) => ({
          ...runResult,
          fitness: evaluationResult.results[index]?.fitness,
          feedback: evaluationResult.results[index]?.feedback,
          finalWorkflowOutputs: runResult.queueRunResult.finalWorkflowOutput,
        })
      )

      // Save workflow to file if it was loaded from file and has memory updates
      if ("filename" in input && input.filename) {
        const hasMemoryUpdates = workflow
          .getConfig()
          .nodes.some((n) => n.memory && Object.keys(n.memory).length > 0)

        if (hasMemoryUpdates) {
          try {
            await workflow.saveToFile(input.filename)
            lgg.log(
              `[invokeWorkflow] Saved memory updates to ${input.filename}`
            )
          } catch (saveError) {
            lgg.error(
              `[invokeWorkflow] Failed to save memory updates: ${saveError}`
            )
          }
        }
      }

      return R.success(resultsWithEvaluation, evaluationResult.totalCost)
    }

    // Save workflow to file if it was loaded from file and has memory updates
    if ("filename" in input && input.filename) {
      const hasMemoryUpdates = workflow
        .getConfig()
        .nodes.some((n) => n.memory && Object.keys(n.memory).length > 0)

      if (hasMemoryUpdates) {
        try {
          await workflow.saveToFile(input.filename)
          lgg.log(`[invokeWorkflow] Saved memory updates to ${input.filename}`)
        } catch (saveError) {
          lgg.error(
            `[invokeWorkflow] Failed to save memory updates: ${saveError}`
          )
        }
      }
    }

    // If no evaluation needed, return raw run results
    return R.success(
      runResults,
      runResults.reduce(
        (total, result) => total + result.queueRunResult.totalCost,
        0
      )
    )
  } catch (err) {
    lgg.error("Invocation failed", err)
    return R.error(err instanceof Error ? err.message : "Unknown error", 0)
  }
}
