/**
 * evaluation.ts - Logic to score model performance in tool selection
 * Strict: only checks whether the selected tool is the expected one.
 */
import type { RunTrace } from "./openaiRunner"

export interface RunOutcome {
  promptId: string
  model: string
  success: boolean
  details: string
}

export type FailureType =
  | "F1" // No tool called
  | "F2" // Wrong tool selected
  | "F6" // System/API error

export function classifyFailure(trace: RunTrace, expectedTool: string): FailureType {
  const lastCall = trace.toolCalls[trace.toolCalls.length - 1]

  if (!lastCall) {
    return "F1" // No tool called
  }

  if ((lastCall as any).toolName !== expectedTool) {
    return "F2" // Wrong tool selected
  }

  // If we reached here, selection matched and no apparent error; this function
  // is only called on failures, so default to system/API error classification.
  return "F6"
}

/**
 * Decide if the task is solved strictly by tool selection.
 */
export async function evaluate(
  trace: RunTrace,
  expectedTool: string,
): Promise<RunOutcome & { failureType?: FailureType }> {
  const lastToolMsg = trace.toolCalls[trace.toolCalls.length - 1] as any

  if (!lastToolMsg) {
    return {
      promptId: "",
      model: "",
      success: false,
      details: `Selected: none, Expected: ${expectedTool}`,
      failureType: "F1",
    }
  }

  if (lastToolMsg.toolName !== expectedTool) {
    return {
      promptId: "",
      model: "",
      success: false,
      details: `Selected: ${lastToolMsg.toolName}, Expected: ${expectedTool}`,
      failureType: "F2",
    }
  }

  return {
    promptId: "",
    model: "",
    success: true,
    details: "Selected correct tool",
  }
}
