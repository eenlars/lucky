import { requireExecutionContext } from "@core/context/executionContext"
import { getCoreConfig } from "@core/core-config/coreConfig"
import { SpendingTracker } from "./SpendingTracker"

/**
 * Gets the per-context SpendingTracker instance.
 * Lazily creates and initializes the tracker on first access within a workflow execution.
 *
 * @returns SpendingTracker instance scoped to the current execution context
 * @throws Error if called outside of execution context
 */
export function getSpendingTracker(): SpendingTracker {
  const ctx = requireExecutionContext()
  let tracker = ctx.get("spendingTracker") as SpendingTracker | undefined
  if (!tracker) {
    tracker = SpendingTracker.create(getCoreConfig().limits.maxCostUsdPerRun)
    ctx.set("spendingTracker", tracker)
  }
  return tracker
}
