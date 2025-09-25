// evaluator that runs workflow without evaluation for prompt-only flows

import type { WorkflowEvaluationResult } from "@core/evaluation/evaluators/WorkflowEvaluator"
import { lgg } from "@core/utils/logging/Logger"
import { R, type RS } from "@core/utils/types"
import type { Workflow } from "@core/workflow/Workflow"
import { WorkflowEvaluator } from "./WorkflowEvaluator"

/**
 * For prompt-only runs: execute the workflow and return the output and a
 * placeholder perfect fitness, skipping any correctness evaluation.
 */
export class NoEvaluator extends WorkflowEvaluator {
  async evaluate(workflow: Workflow): Promise<RS<WorkflowEvaluationResult>> {
    const startTime = Date.now()

    lgg.log(`[NoEvaluator] Running workflow (no evaluation) for ${workflow.getWorkflowVersionId()}`)

    const run = await workflow.run()
    if (!run.success || !run.data) {
      lgg.error(`[NoEvaluator] Run failed for ${workflow.getWorkflowVersionId()}: ${run.error}`)
      return R.error(run.error ?? "Failed to run workflow", 0)
    }

    const runResults = run.data

    // Aggregate minimal transcript and summaries from node logs
    const transcript = runResults
      .map((r, idx) => `Case ${idx + 1}: ${r.queueRunResult.finalWorkflowOutput}`)
      .join("\n\n")

    const summaries = runResults.flatMap((r, caseIndex: number) =>
      r.queueRunResult.agentSteps.map((output: any, nodeIndex: number) => ({
        timestamp: Date.now(),
        nodeId: `case-${caseIndex + 1}-node-${nodeIndex + 1}`,
        summary: (output?.return ? String(output.return) : String(r.queueRunResult.finalWorkflowOutput)) || "",
      }))
    )

    const totalCost = runResults.reduce((sum, r) => sum + (r.queueRunResult.totalCost || 0), 0)

    const totalTimeSeconds = (Date.now() - startTime) / 1000

    lgg.log("[NoEvaluator] Workflow run complete", {
      workflowLink: workflow.getLink(workflow.getWorkflowInvocationId()),
      cost: totalCost,
      time: totalTimeSeconds,
      cases: runResults.length,
    })

    return {
      success: true,
      data: {
        fitness: {
          score: 1.0,
          totalCostUsd: totalCost,
          totalTimeSeconds,
          accuracy: 1.0,
        },
        feedback: "Prompt-only workflow - no evaluation performed",
        transcript,
        cost: totalCost,
        summaries,
      },
      usdCost: totalCost,
    }
  }
}
