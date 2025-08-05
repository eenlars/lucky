// evaluator that runs workflow once with all questions combined

import type { WorkflowEvaluationResult } from "@improvement/evaluators/WorkflowEvaluator"
import { lgg } from "@logger"
import { R, type RS } from "@utils/types"
import { guard } from "@workflow/schema/errorMessages"
import { Workflow } from "@workflow/Workflow"
import { WorkflowEvaluator } from "./WorkflowEvaluator"

/**
 * Evaluates a workflow by running it once with all workflow cases combined.
 * The workflow receives a structured prompt containing all cases
 * and must answer them all in a single execution.
 */
export class AggregatedEvaluator extends WorkflowEvaluator {
  async evaluate(workflow: Workflow): Promise<RS<WorkflowEvaluationResult>> {
    // run the workflow once with all questions
    const startTime = Date.now()

    lgg.log(
      `[AggregatedEvaluator] Starting workflow evaluation for ${workflow.getWorkflowVersionId()}`
    )
    lgg.log(`[AggregatedEvaluator] Workflow has ${workflow.nodes.length} nodes`)
    lgg.log(`[AggregatedEvaluator] Entry node ID: ${workflow.getEntryNodeId()}`)

    const data = await workflow.runAndEvaluate()

    if (!data.success) {
      lgg.error(
        `[AggregatedEvaluator] Workflow runAndEvaluate failed for ${workflow.getWorkflowVersionId()}: ${data.error}`
      )
      return R.error(`Failed to evaluate workflow: ${data.error}`, 0)
    }

    lgg.log(
      `[AggregatedEvaluator] Workflow runAndEvaluate succeeded for ${workflow.getWorkflowVersionId()}`
    )

    const { results, averageFitness, averageFeedback } = data.data
    const totalTime = Date.now() - startTime

    lgg.log("[AggregatedEvaluator] Workflow execution complete", {
      workflowLink: workflow.getLink(workflow.getWorkflowInvocationId()),
      cost: data.usdCost,
      time: totalTime / 1000,
      resultsLength: results.length,
      fitness: averageFitness,
    })

    // use the average fitness from all results
    guard(averageFitness, "No fitness found")

    // get combined transcript and summaries from all results
    const combinedTranscript = results.map((r) => r.transcript).join("\n\n")
    const combinedSummaries = results.flatMap((r) => r.summaries)

    return {
      success: true,
      data: {
        fitness: {
          score: averageFitness.score,
          totalCostUsd: averageFitness.totalCostUsd,
          // still some bias in here, if requests are stalled.
          totalTimeSeconds: averageFitness.totalTimeSeconds,
          accuracy: averageFitness.accuracy,
          novelty: averageFitness.novelty,
        },
        feedback: averageFeedback,
        transcript: combinedTranscript,
        cost: data.usdCost ?? 0,
        summaries: combinedSummaries,
      },
      usdCost: data.usdCost,
    }
  }
}
