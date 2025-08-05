"use server"

import type { EvaluationText } from "@core/workflow/ingestion/ingestion.types"
import { invokeWorkflow } from "@core/workflow/runner/invokeWorkflow"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

export async function runWorkflowFromDSL(
  dslConfig: WorkflowConfig,
  workflowId: string,
  prompt?: string
) {
  try {
    const evalInput: EvaluationText = {
      workflowId,
      type: "text" as const,
      question: prompt || "Test execution",
      answer: "Expected output",
      goal: "Execute workflow with user prompt",
    }

    const result = await invokeWorkflow({
      dslConfig,
      evalInput,
    })

    return result
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to run workflow",
      data: undefined,
      usdCost: 0,
    }
  }
}
