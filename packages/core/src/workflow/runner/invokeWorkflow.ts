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

import { getCoreConfig } from "@core/core-config/coreConfig"
import { WorkflowConfigurationError, WorkflowExecutionError } from "@core/utils/errors/workflow-errors"
import { lgg } from "@core/utils/logging/Logger"
import { obs } from "@core/utils/observability/obs"
import { verifyWorkflowConfigStrict } from "@core/utils/validation/workflow/verifyWorkflow"
import { Workflow } from "@core/workflow/Workflow"
import { needsEvaluation } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { loadFromDSL, loadFromDatabase, loadFromFile } from "@core/workflow/setup/WorkflowLoader"
import { JSONN, R, type RS, genShortId, isNir } from "@lucky/shared"
import type { InvocationInput, InvokeWorkflowResult, RunResult } from "./types"

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
export async function invokeWorkflow(input: InvocationInput): Promise<RS<InvokeWorkflowResult[]>> {
  try {
    const { evalInput, onProgress, abortSignal } = input

    if (isNir(evalInput)) {
      lgg.error("evalInput is null/undefined", evalInput)
      throw new WorkflowExecutionError("Evaluation input is missing or invalid.", {
        details: { providedInput: evalInput },
      })
    }

    // Set defaults
    evalInput.workflowId ??= `wf_id_${genShortId()}`
    if (evalInput.type === "text" && !evalInput.answer) {
      evalInput.answer = ""
    }

    // Validate prompt-only inputs at core level to prevent bypass
    if (evalInput.type === "prompt-only") {
      if (!evalInput.goal || typeof evalInput.goal !== "string" || evalInput.goal.trim().length === 0) {
        return R.error("Invalid or missing goal for prompt-only invocation", 0)
      }
      if (evalInput.goal.length > 50000) {
        return R.error("Prompt too long (max 50,000 characters)", 0)
      }
      // Trim the goal for consistency
      evalInput.goal = evalInput.goal.trim()
    }

    let config: WorkflowConfig

    // Support both old API (properties directly on input) and new API (source object)
    const source = input.source

    if (source) {
      // New API: source object
      if (source.kind === "version") {
        config = await loadFromDatabase(source.id)
      } else if (source.kind === "filename") {
        config = await loadFromFile(source.path)
      } else if (source.kind === "dsl") {
        config = await loadFromDSL({
          nodes: source.config.nodes as WorkflowNodeConfig[], // todo tools is not typed here
          entryNodeId: source.config.entryNodeId,
        })
      } else {
        throw new WorkflowConfigurationError("Invalid source kind. Must be 'version', 'filename', or 'dsl'.", {
          field: "source.kind",
          expectedFormat: "'version' | 'filename' | 'dsl'",
        })
      }
    } else if ("workflowVersionId" in input && (input as any).workflowVersionId) {
      // Old API (deprecated): properties directly on input
      config = await loadFromDatabase((input as any).workflowVersionId)
    } else if ("filename" in input && (input as any).filename) {
      config = await loadFromFile((input as any).filename)
    } else if ("dslConfig" in input && (input as any).dslConfig) {
      config = await loadFromDSL((input as any).dslConfig)
    } else {
      throw new WorkflowConfigurationError(
        "No workflow source provided. Must specify source: InvocationSource (new API) or workflowVersionId/filename/dslConfig (deprecated).",
        {
          field: "source",
          expectedFormat: "InvocationSource | { workflowVersionId } | { filename } | { dslConfig }",
        },
      )
    }

    // Validate workflow based on validation method
    // Note: SpendingTracker is now per-context and auto-initialized on first access via getSpendingTracker()
    const validationMethod = input.validation ?? "strict"

    if (validationMethod === "strict") {
      await verifyWorkflowConfigStrict(config)
    } else if (validationMethod === "ai") {
      // AI-powered validation and repair (not implemented yet - would call validateAndRepairWorkflow)
      lgg.warn("[invokeWorkflow] AI validation not yet implemented, falling back to strict")
      await verifyWorkflowConfigStrict(config)
    } else {
      lgg.log("[invokeWorkflow] Skipping validation (validation='none')")
    }

    // Create workflow
    const workflow = Workflow.create({
      config: config,
      evaluationInput: evalInput,
      toolContext: undefined,
      // No parentVersionId or evolutionContext for ad-hoc invocation
    })

    // Set workflow IO (handles multiple inputs via IngestionLayer)
    await workflow.prepareWorkflow(evalInput, getCoreConfig().workflow.prepareProblemMethod)

    const { success, error, data: runResults } = await workflow.run({ onProgress, abortSignal })

    if (!runResults || !success) {
      return R.error(error || "Unknown error", 0)
    }

    if (runResults) {
      lgg.log("Run results", JSONN.show(runResults.map(r => r.queueRunResult.finalWorkflowOutput)))
    }

    // Check if we need to evaluate (when there's something to compare against)
    if (needsEvaluation(evalInput)) {
      // Evaluate the results to calculate fitness and save to database
      const { success, error, data: evaluationResult } = await workflow.evaluate()
      if (!success) {
        lgg.error(`[InvokeWorkflow] Evaluation failed for workflow ${workflow.getWorkflowVersionId()}: ${error}`)
        return R.error(error, 0)
      }

      // Return all evaluation results with fitness and feedback
      const resultsWithEvaluation = runResults.map((runResult: RunResult, index) => ({
        ...runResult,
        fitness: evaluationResult.results[index]?.fitness,
        feedback: evaluationResult.results[index]?.feedback,
        finalWorkflowOutputs: runResult.queueRunResult.finalWorkflowOutput,
      }))

      // Save workflow to file if it was loaded from file and has memory updates
      if ("filename" in input && input.filename) {
        const hasMemoryUpdates = workflow.getConfig().nodes.some(n => n.memory && Object.keys(n.memory).length > 0)

        if (hasMemoryUpdates && input.source.kind === "filename") {
          try {
            await workflow.saveToFile(input.source.path)
            lgg.log(`[invokeWorkflow] Saved memory updates to ${input.filename}`)
          } catch (saveError) {
            lgg.error(`[invokeWorkflow] Failed to save memory updates: ${saveError}`)
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
      const hasMemoryUpdates = workflow.getConfig().nodes.some(n => n.memory && Object.keys(n.memory).length > 0)

      if (hasMemoryUpdates && input.source.kind === "filename") {
        try {
          await workflow.saveToFile(input.source.path)
          lgg.log(`[invokeWorkflow] Saved memory updates to ${input.filename}`)
        } catch (saveError) {
          lgg.error(`[invokeWorkflow] Failed to save memory updates: ${saveError}`)
        }
      }
    }

    // If no evaluation needed, return raw run results
    return R.success(
      runResults,
      runResults.reduce((total, result) => total + result.queueRunResult.totalCost, 0),
    )
  } catch (err) {
    lgg.error("Invocation failed", err)
    return R.error(err instanceof Error ? err.message : "Unknown error", 0)
  }
}
