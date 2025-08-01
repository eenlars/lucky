import type { WorkflowMessage } from "@/core/messages/WorkflowMessage"
import { lgg } from "@/core/utils/logging/Logger"
import { validateNodeOutput } from "./validateNodeOutput"
import {
  DEFAULT_VALIDATION_CONFIG,
  type ValidationConfig,
} from "./validationConfig"

export interface ValidationDecision {
  shouldProceed: boolean
  validationError: string | null
  validationCost: number
}

/**
 * Main validation function that analyzes node output and decides whether to proceed with handoff.
 * Keeps responseHandler.ts minimal by encapsulating all validation logic here.
 */
export async function validateAndDecide({
  nodeOutput,
  workflowMessage,
  systemPrompt,
  nodeId,
  validationConfig = DEFAULT_VALIDATION_CONFIG,
}: {
  nodeOutput: string
  workflowMessage: WorkflowMessage
  systemPrompt: string
  nodeId: string
  validationConfig?: ValidationConfig
}): Promise<ValidationDecision> {
  if (!validationConfig.enabled) {
    return {
      shouldProceed: true,
      validationError: null,
      validationCost: 0,
    }
  }

  // Extract the original task from the workflow message
  let originalTask = "No specific task provided"
  const payload = workflowMessage.payload

  if (payload.kind === "delegation" || payload.kind === "sequential") {
    originalTask = payload.prompt
  } else if (payload.kind === "error" || payload.kind === "result-error") {
    originalTask = payload.message
  } else if (payload.kind === "result") {
    originalTask = payload.workDone
  } else if (payload.kind === "control") {
    originalTask = `Control signal: ${payload.flag}`
  }

  const { validation, error, usdCost } = await validateNodeOutput({
    nodeOutput,
    originalTask,
    systemPrompt,
    nodeId,
  })

  if (validation) {
    lgg.log("Output validation results:", {
      nodeId,
      overallScore: validation.overallScore,
      recommendation: validation.recommendation,
      taskFulfillment: validation.taskFulfillment.score,
      systemPromptCompliance: validation.systemPromptCompliance.score,
      outputQuality: validation.outputQuality.score,
    })

    // Handle validation results based on recommendation
    if (
      validation.recommendation === "escalate" &&
      validationConfig.actions.onEscalate === "block"
    ) {
      return {
        shouldProceed: false,
        validationError: `Output validation failed: ${validation.taskFulfillment.reasoning}. Critical issues: ${validation.taskFulfillment.criticalIssues.join(", ")}`,
        validationCost: usdCost,
      }
    }

    if (
      validation.recommendation === "retry" &&
      validationConfig.actions.onRetry === "warn"
    ) {
      lgg.warn(
        "Output quality concerns detected:",
        validation.outputQuality.improvements
      )
    }
  } else if (error) {
    lgg.error("Validation failed:", error)
    // Continue with handoff despite validation failure
  }

  return {
    shouldProceed: true,
    validationError: null,
    validationCost: usdCost,
  }
}
