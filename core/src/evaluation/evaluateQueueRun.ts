import { calculateFeedback } from "@core/evaluation/calculate-fitness/calculateFeedback"
import { calculateFitness } from "@core/evaluation/calculate-fitness/randomizedFitness"
import { Json } from "@core/utils/clients/supabase/types"
import { updateWorkflowInvocationInDatabase } from "@core/utils/persistence/workflow/registerWorkflow"
import { R, type RS } from "@core/utils/types"
import type {
  EvaluationResult,
  QueueRunResult,
} from "@core/workflow/runner/types"
import { guard } from "@core/workflow/schema/errorMessages"
import type { Workflow } from "@core/workflow/Workflow"
import { CONFIG } from "@runtime/settings/constants"
import { JSONN } from "@shared/index"

export const evaluateQueueRun = async ({
  workflow,
  queueRunResult,
  evaluation,
  workflowInvocationId,
}: {
  workflow: Workflow
  queueRunResult: QueueRunResult
  evaluation: string
  workflowInvocationId: string
}): Promise<RS<EvaluationResult>> => {
  const workflowIO = workflow.getWorkflowIO()

  guard(workflowIO.length > 0, "Evaluation input is empty")

  const fitnessResult = await calculateFitness({
    agentSteps: queueRunResult.agentSteps,
    totalTime: queueRunResult.totalTime,
    totalCost: queueRunResult.totalCost,
    evaluation: evaluation,
    outputSchema: workflowIO[0].workflowOutput.outputSchema, //todo what if there are multiple IOs? (currently not the case)
    finalWorkflowOutput: queueRunResult.finalWorkflowOutput,
  })

  let feedbackResult: RS<string> | null = null
  if (CONFIG.improvement.flags.operatorsWithFeedback) {
    feedbackResult = await calculateFeedback({
      agentSteps: queueRunResult.agentSteps,
      evaluation: evaluation,
    })
    if (!feedbackResult.success) {
      return R.error(feedbackResult.error, feedbackResult.usdCost)
    }
  }

  if (!fitnessResult.success)
    return R.error(fitnessResult.error, fitnessResult.usdCost)

  const fitness = fitnessResult.data

  await updateWorkflowInvocationInDatabase({
    workflowInvocationId: workflowInvocationId,
    status: "completed",
    end_time: new Date().toISOString(),
    usd_cost: queueRunResult.totalCost + (fitnessResult.usdCost ?? 0),
    // todo-typesafety: unsafe 'as' type assertions - violates CLAUDE.md "we hate as"
    fitness: fitnessResult as unknown as Json,
    extras: {
      evaluation: JSONN.show(evaluation),
      actualOutput: JSONN.show(queueRunResult.agentSteps),
    },
    workflow_output: evaluation as unknown as Json,
    expected_output:
      typeof evaluation === "string" ? evaluation : JSON.stringify(evaluation),
    actual_output: queueRunResult.finalWorkflowOutput,
    feedback: feedbackResult?.data ?? "",
    fitness_score: Math.round(fitness.score),
    accuracy: Math.round(fitness.accuracy),
  })

  return {
    success: true,
    data: {
      transcript: queueRunResult.agentSteps,
      summaries: queueRunResult.agentSteps.map((output, index) => ({
        timestamp: Date.now(),
        nodeId: `node-${index}`,
        summary: output.return?.toString() || "", // todo-wrong
      })),
      fitness: fitness,
      feedback: feedbackResult?.data ?? "",
      finalWorkflowOutput: queueRunResult.finalWorkflowOutput,
    },
    usdCost: queueRunResult.totalCost + (fitnessResult.usdCost ?? 0),
  }
}
