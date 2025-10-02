import type { InvokeWorkflowResult } from "@lucky/core/workflow/runner/types"

export type ErrorResult = { error: string }

export function isInvokeWorkflowResult(value: unknown): value is InvokeWorkflowResult {
  if (value === null || typeof value !== "object") return false
  const obj = value as Record<string, unknown>
  const qrr = obj["queueRunResult"] as Record<string, unknown> | undefined
  if (!qrr || typeof qrr !== "object") return false
  const finalOut = qrr["finalWorkflowOutput"]
  return typeof finalOut === "string"
}

export function isErrorResult(value: unknown): value is ErrorResult {
  if (value === null || typeof value !== "object") return false
  const obj = value as Record<string, unknown>
  return typeof obj["error"] === "string"
}
