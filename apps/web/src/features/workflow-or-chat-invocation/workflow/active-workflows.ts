/**
 * In-memory store for active workflow abort controllers.
 * Maps request IDs to workflow entries for graceful cancellation.
 *
 * Note: This is used as a fallback when Redis is unavailable.
 * In multi-server deployments, Redis pub/sub is the primary coordination mechanism.
 */

/**
 * Active workflow entry with state tracking and TTL
 */
export interface ActiveWorkflowEntry {
  controller: AbortController
  createdAt: number
  state: "running" | "cancelling" | "cancelled"
  cancelRequestedAt?: number
}

/**
 * In-memory Map for active workflows
 */
export const activeWorkflows = new Map<string, ActiveWorkflowEntry>()

/**
 * TTL cleanup for stale workflow entries (prevents memory leaks)
 * Runs every 5 minutes, removes entries older than 2 hours
 */
const TTL_CHECK_INTERVAL = 5 * 60 * 1000 // 5 minutes
const MAX_ENTRY_AGE = 2 * 60 * 60 * 1000 // 2 hours

const cleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of activeWorkflows.entries()) {
    if (now - entry.createdAt > MAX_ENTRY_AGE) {
      activeWorkflows.delete(id)
      console.warn(`[active-workflows] Reaped stale workflow entry: ${id}`)
    }
  }
}, TTL_CHECK_INTERVAL)

// Don't keep the process alive just for cleanup
cleanupInterval.unref()
