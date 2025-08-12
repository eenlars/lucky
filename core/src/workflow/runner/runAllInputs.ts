import {
  calculateAverageFeedback,
  calculateAverageFitness,
} from "@core/evaluation/calculate-fitness/average"
import { evaluateQueueRun } from "@core/evaluation/evaluateQueueRun"
import { isNir } from "@core/utils/common/isNir"
import { lgg } from "@core/utils/logging/Logger"
import { R, type RS } from "@core/utils/types"
import {
  queueRun,
  type AggregateEvaluationResult,
  type EvaluationResult,
  type QueueRunResult,
} from "@core/workflow/runner/queueRun"
import { guard } from "@core/workflow/schema/errorMessages"
import type { Workflow } from "@core/workflow/Workflow"
import { CONFIG } from "@runtime/settings/constants"

export type RunResult = {
  workflowInvocationId: string
  queueRunResult: QueueRunResult
}

const verbose = false

export async function runAllIO(workflow: Workflow): Promise<RS<RunResult[]>> {
  const workflowIo = workflow.getWorkflowIO()
  guard(workflowIo, "No workflow IO")

  lgg.onlyIf(
    verbose,
    `[runAllIO] Starting for ${workflow.getWorkflowVersionId()} with ${workflowIo.length} IO cases`
  )

  const batchSize = CONFIG.limits.maxConcurrentWorkflows
  const results: RunResult[] = []

  for (let i = 0; i < workflowIo.length; i += batchSize) {
    const batch = workflowIo.slice(i, i + batchSize)
    lgg.onlyIf(
      verbose,
      `[runAllIO] Processing batch ${Math.floor(i / batchSize) + 1} with ${batch.length} items`
    )

    const batchPromises = batch.map(async (workflowIO, batchIndex) => {
      try {
        const globalIndex = i + batchIndex
        lgg.onlyIf(
          verbose,
          `[runAllIO] Creating invocation for IO ${globalIndex}`
        )
        const invocationId = await workflow.createInvocationForIO(
          globalIndex,
          workflowIO
        )
        lgg.onlyIf(
          verbose,
          `[runAllIO] Starting queueRun for invocation ${invocationId}`
        )
        const queueRunResult = await queueRun({
          workflow,
          workflowInput: workflowIO.workflowInput,
          workflowInvocationId: invocationId,
        })
        lgg.onlyIf(
          verbose,
          `[runAllIO] queueRun completed for invocation ${invocationId}`
        )
        return { workflowInvocationId: invocationId, queueRunResult }
      } catch (error) {
        // Skip this IO on error, do not push anything to results
        lgg.error(
          `[runAllIO] Failed to run queue for IO ${i + batchIndex}: ${error}`,
          {
            workflow: workflow.getWorkflowVersionId(),
            workflowIO,
            error,
          }
        )
        // No return, so this promise resolves to undefined and will be filtered out later
        return undefined
      }
    })

    const batchResults = await Promise.all(batchPromises)
    const validResults = batchResults.filter((r) => !isNir(r))
    const failedResults = batchResults.filter((r) => isNir(r))
    results.push(...validResults)
    lgg.onlyIf(
      verbose,
      `[runAllIO] Batch ${Math.floor(i / batchSize) + 1} completed: ${validResults.length}/${batch.length} succeeded`
    )
    lgg.onlyIf(
      verbose,
      `[runAllIO] Batch ${Math.floor(i / batchSize) + 1} failed: ${failedResults.length}/${batch.length} failed`,
      JSON.stringify(failedResults)
    )
  }

  lgg.onlyIf(
    verbose,
    `[runAllIO] All batches completed for ${workflow.getWorkflowVersionId()}: ${results.length}/${workflowIo.length} total succeeded`
  )

  if (isNir(results)) {
    lgg.error(
      `[runAllIO] No results obtained for ${workflow.getWorkflowVersionId()}`
    )
    return R.error("standard evaluator failed to run all IO", 0)
  }
  return R.success(results, 0)
}

export async function evaluateRuns(
  workflow: Workflow,
  runResults: RunResult[]
): Promise<EvaluationResult[]> {
  const workflowIo = workflow.getWorkflowIO()
  lgg.onlyIf(
    workflowIo.length !== runResults.length,
    `Mismatch between run results and IO: ${workflowIo.length} !== ${runResults.length}`
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

export async function aggregateResults(
  evals: EvaluationResult[]
): Promise<RS<AggregateEvaluationResult>> {
  guard(evals.length > 0, "No evaluation results")

  const totalCost = evals.reduce(
    (acc, result) => acc + result.fitness.totalCostUsd,
    0
  )

  const averageFitness = calculateAverageFitness(evals.map((r) => r.fitness))
  let averageFeedback: string | undefined
  const evalFeedback = evals.map((r) => r.feedback)
  guard(evalFeedback.length > 0, "No feedback to average")
  console.log(evalFeedback, evals)
  if (CONFIG.improvement.flags.operatorsWithFeedback) {
    const { success, data, error } =
      await calculateAverageFeedback(evalFeedback)
    if (!success) {
      lgg.error(`Failed to calculate average feedback: ${error}`)
      return R.error(error, 0)
    }
    averageFeedback = data
  }

  return R.success(
    {
      results: evals,
      totalCost,
      averageFitness,
      averageFeedback: averageFeedback ?? "feedback is disabled.",
    },
    totalCost
  )
}
