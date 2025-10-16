import { getExecutionContext } from "@core/context/executionContext"
import { getCoreConfig } from "@core/core-config/coreConfig"
import { SpendingTracker } from "./SpendingTracker"

// Global fallback tracker for test/dev environments without execution context
let globalTracker: SpendingTracker | undefined

/**
 * Gets the per-context SpendingTracker instance.
 * Lazily creates and initializes the tracker on first access within a workflow execution.
 *
 * In test/dev environments without execution context, returns a global fallback tracker.
 * In production, requires execution context.
 *
 * @returns SpendingTracker instance scoped to the current execution context
 * @throws Error if called outside of execution context in production
 */
export function getSpendingTracker(): SpendingTracker {
  const ctx = getExecutionContext()
  const isProduction = process.env.NODE_ENV === "production"
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"

  // In production, require execution context
  if (isProduction && !ctx) {
    throw new Error("No execution context. Workflow must be invoked via API endpoint.")
  }

  // If we have a context, use it
  if (ctx) {
    let tracker = ctx.get("spendingTracker") as SpendingTracker | undefined
    if (!tracker) {
      tracker = SpendingTracker.create(getCoreConfig().limits.maxCostUsdPerRun)
      ctx.set("spendingTracker", tracker)
    }
    return tracker
  }

  // Fallback for test/dev without context: use global tracker
  if (!globalTracker) {
    globalTracker = SpendingTracker.create(getCoreConfig().limits.maxCostUsdPerRun)
  }
  return globalTracker
}
