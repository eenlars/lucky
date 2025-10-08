import { isNir } from "@lucky/shared/client"

export const Errors = {
  workflowInvocationIdNotSet: "Workflow invocation ID is not set, probably you have never run the system.",
  entryNodeIdNotSet: "Entry node ID is not set",
  noActiveRunId: "No active run ID available - ensure createRun() was called first",
  noCurrentGenerationId: "No current generation ID available - ensure createGeneration() was called first",
}

// also checks empty arrays, objects, etc. (only empty stuff. a false boolean is not empty.)
export function guard<T>(value: T, message: string): asserts value is NonNullable<T> {
  if (isNir(value)) throw new Error(message)
}

export function guardType<T>(
  value: unknown,
  predicate: (value: unknown) => value is T,
  message: string,
): asserts value is T {
  if (!predicate(value)) throw new Error(message)
}

export function ensure<T>(value: T | null | undefined, message: string): T {
  if (isNir(value)) throw new Error(message)
  return value
}

export function throwIf(value: boolean, message: string): asserts value is Exclude<typeof value, true> {
  if (value === true) throw new Error(message)
}

export function onlyIf(condition: unknown, message: string): string {
  if (typeof condition === "boolean") {
    if (condition) return message
    return ""
  }
  if (isNir(condition)) return ""
  return message
}

import { EnhancedError } from "@core/utils/errors/enhanced-error"

export class WorkflowError extends EnhancedError {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super({
      title: "Workflow Error",
      message,
      action: "Check the workflow configuration and ensure all required fields are set.",
      debug: {
        code: code || "WORKFLOW_ERROR",
        context: { message },
        timestamp: new Date().toISOString(),
      },
      retryable: false,
    })
    this.name = "WorkflowError"
  }
}
