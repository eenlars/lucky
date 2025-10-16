import { getExecutionContext } from "@core/context/executionContext"
import { getCoreConfig } from "@core/core-config/coreConfig"
import { SpendingTracker } from "./SpendingTracker"

// Global fallback tracker for test/dev environments without execution context
let globalTracker: SpendingTracker | undefined

/**
 * Gets the per-context SpendingTracker instance.
 * Lazily creates and initializes the tracker on first access within a workflow execution.
 *
 * Prefers execution context when available, falls back to global tracker for isolated testing.
 * Logs error in production when context is missing to aid debugging.
 *
 * @returns SpendingTracker instance scoped to the current execution context or global fallback
 */
export function getSpendingTracker(): SpendingTracker {
  const ctx = getExecutionContext()
  const isProduction = process.env.NODE_ENV === "production"
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"

  // If we have a context, use it (preferred path)
  if (ctx) {
    let tracker = ctx.get("spendingTracker") as SpendingTracker | undefined
    if (!tracker) {
      tracker = SpendingTracker.create(getCoreConfig().limits.maxCostUsdPerRun)
      ctx.set("spendingTracker", tracker)
    }
    return tracker
  }

  // No context - this is an error in production
  if (isProduction) {
    throw new Error(
      "[getSpendingTracker] FATAL: No execution context in production. " +
        "Workflow must be invoked via API endpoint with withExecutionContext(). " +
        "Cannot proceed without proper context to track costs accurately.",
    )
  }

  // Fallback for test/dev/isolated execution: use global tracker
  // This is safe because test/dev environments don't have concurrent production workflows
  if (!globalTracker) {
    globalTracker = SpendingTracker.create(getCoreConfig().limits.maxCostUsdPerRun)
  }
  return globalTracker
}
