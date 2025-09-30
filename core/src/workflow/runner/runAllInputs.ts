/**
 * Batch execution and evaluation module for workflows.
 *
 * Handles running workflows with multiple input/output cases in parallel batches,
 * evaluating results, and aggregating fitness scores and feedback.
 *
 * Key functions:
 * - runAllIO: Execute workflow on all input cases with batching
 * - evaluateRuns: Evaluate execution results against expected outputs
 * - aggregateResults: Combine evaluation results into aggregate fitness
 *
 * @module workflow/runner/runAllInputs
 */

import { calculateAverageFitness, calculateFeedbackGrouped } from "@core/evaluation/calculate-fitness/average"
import { evaluateQueueRun } from "@core/evaluation/evaluateQueueRun"
import { isNir } from "@core/utils/common/isNir"
import { lgg } from "@core/utils/logging/Logger"
import { R, type RS } from "@core/utils/types"
import { queueRun } from "@core/workflow/runner/queueRun"
import { guard } from "@core/workflow/schema/errorMessages"
import type { Workflow } from "@core/workflow/Workflow"
import { CONFIG } from "@core/core-config/compat"
import type { AggregateEvaluationResult, EvaluationResult, RunResult } from "./types"

/**
 * Run result for a single workflow IO case.
 */
// RunResult interface is centralized in ./types

const verbose = false

/**
 * Executes a workflow on all input/output test cases in parallel batches.
 *
 * @param workflow - Workflow instance to execute
 * @returns Result containing array of run results for each IO case
 *
 * @remarks
 * - Processes IO cases in batches of CONFIG.limits.maxConcurrentWorkflows
 * - Creates invocations for tracking each execution
 * - Handles failures gracefully by skipping failed IOs
 * - Returns only successful results in output array
 */
export async function runAllIO(workflow: Workflow): Promise<RS<RunResult[]>> {
  const workflowIo = workflow.getWorkflowIO()
  guard(workflowIo, "No workflow IO")

  lgg.onlyIf(verbose, `[runAllIO] Starting for ${workflow.getWorkflowVersionId()} with ${workflowIo.length} IO cases`)

  const batchSize = CONFIG.limits.maxConcurrentWorkflows
  const results: RunResult[] = []

  for (let i = 0; i < workflowIo.length; i += batchSize) {
    const batch = workflowIo.slice(i, i + batchSize)
    lgg.onlyIf(verbose, `[runAllIO] Processing batch ${Math.floor(i / batchSize) + 1} with ${batch.length} items`)

    const batchPromises = batch.map(async (workflowIO, batchIndex) => {
      try {
        const globalIndex = i + batchIndex
        lgg.onlyIf(verbose, `[runAllIO] Creating invocation for IO ${globalIndex}`)
        const invocationId = await workflow.createInvocationForIO(globalIndex, workflowIO)
        lgg.onlyIf(verbose, `[runAllIO] Starting queueRun for invocation ${invocationId}`)
        const queueRunResult = await queueRun({
          workflow,
          workflowInput: workflowIO.workflowInput,
          workflowInvocationId: invocationId,
        })
        lgg.onlyIf(verbose, `[runAllIO] queueRun completed for invocation ${invocationId}`)
        return { workflowInvocationId: invocationId, queueRunResult }
      } catch (error) {
        // Skip this IO on error, do not push anything to results
        lgg.error(`[runAllIO] Failed to run queue for IO ${i + batchIndex}: ${error}`, {
          workflow: workflow.getWorkflowVersionId(),
          workflowIO,
          error,
        })
        // No return, so this promise resolves to undefined and will be filtered out later
        return undefined
      }
    })

    const batchResults = await Promise.all(batchPromises)
    const validResults = batchResults.filter(r => !isNir(r))
    const failedResults = batchResults.filter(r => isNir(r))
    results.push(...validResults)
    lgg.onlyIf(
      verbose,
      `[runAllIO] Batch ${Math.floor(i / batchSize) + 1} completed: ${validResults.length}/${batch.length} succeeded`,
    )
    lgg.onlyIf(
      verbose,
      `[runAllIO] Batch ${Math.floor(i / batchSize) + 1} failed: ${failedResults.length}/${batch.length} failed`,
      JSON.stringify(failedResults),
    )
  }

  lgg.onlyIf(
    verbose,
    `[runAllIO] All batches completed for ${workflow.getWorkflowVersionId()}: ${results.length}/${workflowIo.length} total succeeded`,
  )

  if (isNir(results)) {
    lgg.error(`[runAllIO] No results obtained for ${workflow.getWorkflowVersionId()}`)
    return R.error("standard evaluator failed to run all IO", 0)
  }
  return R.success(results, 0)
}

/**
 * Evaluates workflow execution results against expected outputs.
 *
 * @param workflow - Workflow instance that was executed
 * @param runResults - Results from runAllIO execution
 * @returns Array of evaluation results with fitness scores
 *
 * @throws Error if any individual evaluation fails
 *
 * @remarks
 * Maps each run result to its corresponding expected output
 * and calculates fitness based on accuracy and performance.
 */
export async function evaluateRuns(workflow: Workflow, runResults: RunResult[]): Promise<EvaluationResult[]> {
  const workflowIo = workflow.getWorkflowIO()
  lgg.onlyIf(
    workflowIo.length !== runResults.length,
    `Mismatch between run results and IO: ${workflowIo.length} !== ${runResults.length}`,
  )

  const evalPromises = runResults.map(async (runResult, index) => {
    const workflowIO = workflowIo[index]
    const evaluationResult = await evaluateQueueRun({
      workflow,
      queueRunResult: runResult.queueRunResult,
      evaluation: workflowIO.workflowOutput.output,
      workflowInvocationId: runResult.workflowInvocationId,
    })
    if (!evaluationResult.success) {
      throw new Error(`Failed to evaluate: ${evaluationResult.error}`)
    }
    return evaluationResult.data
  })

  return Promise.all(evalPromises)
}

/**
 * Aggregates multiple evaluation results into a single fitness score.
 *
 * @param evals - Array of individual evaluation results
 * @returns Aggregate result containing:
 *   - results: Original evaluation results
 *   - totalCost: Sum of all execution costs
 *   - averageFitness: Weighted average fitness score
 *   - averageFeedback: Combined feedback (if enabled)
 *
 * @throws Error if no evaluation results provided
 *
 * @remarks
 * Uses calculateAverageFitness for weighted averaging.
 * Feedback aggregation is controlled by CONFIG.improvement.flags.operatorsWithFeedback.
 */
export async function aggregateResults(evals: EvaluationResult[]): Promise<RS<AggregateEvaluationResult>> {
  guard(evals.length > 0, "No evaluation results")

  const totalCost = evals.reduce((acc, result) => acc + result.fitness.totalCostUsd, 0)

  const averageFitness = calculateAverageFitness(evals.map(r => r.fitness))
  let averageFeedback: string | undefined
  const evalFeedback = evals.map(r => r.feedback)
  guard(evalFeedback.length > 0, "No feedback to average")
  lgg.log("[aggregateResults] Individual feedback from evaluations:", evalFeedback)
  lgg.log("[aggregateResults] operatorsWithFeedback flag:", CONFIG.improvement.flags.operatorsWithFeedback)
  if (CONFIG.improvement.flags.operatorsWithFeedback) {
    const { success, data, error } = await calculateFeedbackGrouped(evalFeedback)
    if (!success) {
      lgg.error(`Failed to calculate average feedback: ${error}`)
      return R.error(error, 0)
    }
    averageFeedback = data
    lgg.log("[aggregateResults] Generated averageFeedback:", averageFeedback)
  }

  return R.success(
    {
      results: evals,
      totalCost,
      averageFitness,
      averageFeedback: averageFeedback ?? "feedback is disabled.",
    },
    totalCost,
  )
}
