/**
 * Workflow invocation module - Entry point for executing workflows.
 *
 * Supports three methods of workflow loading:
 * - From database by workflow version ID
 * - From local file by filename
 * - From direct DSL configuration object
 *
 * Handles workflow preparation, execution, evaluation, and memory persistence.
 * Tracks spending limits and saves memory updates back to source when applicable.
 *
 * @module workflow/runner/invokeWorkflow
 */

import { isNir } from "@core/utils/common/isNir"
import { genShortId } from "@core/utils/common/utils"
import { lgg } from "@core/utils/logging/Logger"
import { obs } from "@core/utils/observability/obs"
import { SpendingTracker } from "@core/utils/spending/SpendingTracker"
import { R, type RS } from "@core/utils/types"
import { verifyWorkflowConfigStrict } from "@core/utils/validation/workflow"
import { needsEvaluation } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import {
  loadFromDatabase,
  loadFromDSL,
  loadFromFile,
} from "@core/workflow/setup/WorkflowLoader"
import { Workflow } from "@core/workflow/Workflow"
import { JSONN } from "@lucky/shared"
import { CONFIG } from "@runtime/settings/constants"
import type { InvocationInput, InvokeWorkflowResult, RunResult, RuntimeSettings } from "./types"

/**
 * Union of supported ways to invoke a workflow.
 * Provide `evalInput` and exactly one of:
 * - workflowVersionId: load config from database by version id
 * - filename: load config from a local file
 * - dslConfig: pass a config object directly
 */
// InvocationInput and InvokeWorkflowResult centralized in ./types

/**
 * Invokes a workflow with the provided input configuration.
 *
 * @param input - Invocation configuration containing evaluation input and one of:
 *   - workflowVersionId: ID to load workflow from database
 *   - filename: Path to load workflow from file
 *   - dslConfig: Direct workflow configuration object
 *
 * @returns Result containing array of invocation results with:
 *   - queueRunResult: Raw execution results
 *   - fitness: Evaluation score (if evaluation is needed)
 *   - feedback: Evaluation feedback (if evaluation is needed)
 *   - finalWorkflowOutputs: Final outputs from workflow
 *
 * @throws Error if evalInput is missing or no valid workflow source provided
 *
 * @example
 * // Load from database
 * const result = await invokeWorkflow({
 *   workflowVersionId: "wf_123",
 *   evalInput: { type: "text", input: "Hello", workflowId: "test" }
 * })
 *
 * @remarks
 * - Automatically saves memory updates back to file-based workflows
 * - Tracks spending limits when enabled in configuration
 * - Evaluates results when answer/expectedOutput is provided
 */
export async function invokeWorkflow(
  input: InvocationInput
): Promise<RS<InvokeWorkflowResult[]>> {
  try {
    const { evalInput, runtime } = input

    if (isNir(evalInput)) {
      lgg.error("evalInput is null/undefined", evalInput)
      throw new Error("evalInput is null/undefined")
    }

    // Set defaults
    evalInput.workflowId ??= "wf_id_" + genShortId()
    if (evalInput.type === "text" && !evalInput.answer) {
      evalInput.answer = ""
    }

    // Validate prompt-only inputs at core level to prevent bypass
    if (evalInput.type === "prompt-only") {
      if (
        !evalInput.goal ||
        typeof evalInput.goal !== "string" ||
        evalInput.goal.trim().length === 0
      ) {
        return R.error("Invalid or missing goal for prompt-only invocation", 0)
      }
      if (evalInput.goal.length > 50000) {
        return R.error("Prompt too long (max 50,000 characters)", 0)
      }
      // Trim the goal for consistency
      evalInput.goal = evalInput.goal.trim()
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

    // Initialize spending tracker with runtime override or default
    const maxCost = runtime?.maxCost ?? CONFIG.limits.maxCostUsdPerRun
    if (CONFIG.limits.enableSpendingLimits) {
      SpendingTracker.getInstance().initialize(maxCost)
    }

    // Strictly validate before creating workflow
    await verifyWorkflowConfigStrict(config)

    // Create workflow
    const workflow = Workflow.create({
      config: config,
      evaluationInput: evalInput,
      toolContext: undefined,
      // No parentVersionId or evolutionContext for ad-hoc invocation
    })

    // Set workflow IO (handles multiple inputs via IngestionLayer)
    const preparationMethod = runtime?.skipPreparation 
      ? "none" 
      : (runtime?.preparationMethod ?? CONFIG.workflow.prepareProblemMethod)
    
    await workflow.prepareWorkflow(evalInput, preparationMethod)

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
    // Runtime can override to skip evaluation even if ground truth exists
    const shouldEvaluate = !runtime?.skipEvaluation && needsEvaluation(evalInput)
    
    if (shouldEvaluate) {
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

    // Prompt-only: no evaluation needed, just track it
    if (evalInput.type === "prompt-only") {
      obs.event("prompt_only_invocation", {
        unique_invocation_id: evalInput.workflowId,
        workflow_version_id: workflow.getWorkflowVersionId(),
      })
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

/**
 * Simple prompt invocation for frontend use
 */
export async function invokeWorkflowWithPrompt(
  workflowVersionId: string,
  prompt: string,
  options?: {
    goal?: string
    skipEvaluation?: boolean
    skipPreparation?: boolean
    tools?: string[]
    maxCost?: number
  }
): Promise<RS<InvokeWorkflowResult[]>> {
  const runtime: RuntimeSettings = {
    skipEvaluation: options?.skipEvaluation ?? true,
    skipPreparation: options?.skipPreparation ?? false,
    tools: options?.tools,
    maxCost: options?.maxCost ?? 2.0,
  }

  // Use prompt-only type for simple invocations
  const evalInput = {
    type: "prompt-only" as const,
    goal: options?.goal || prompt,
    workflowId: "prompt_" + genShortId(),
  }

  return invokeWorkflow({
    workflowVersionId,
    evalInput,
    runtime,
  })
}
