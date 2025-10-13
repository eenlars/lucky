import { getRedisClient, isRedisAvailable } from "./client"

/**
 * Workflow execution state
 */
export type WorkflowState = "running" | "cancelling" | "cancelled" | "completed" | "failed"

/**
 * Workflow state entry stored in Redis/Map
 */
export interface WorkflowStateEntry {
  state: WorkflowState
  desired: WorkflowState // For cancellation intent
  createdAt: number
  cancelRequestedAt?: number
  startedAt: number
}

/**
 * In-memory fallback Map (used when Redis is unavailable)
 */
const memoryStore = new Map<string, WorkflowStateEntry>()

/**
 * Track if we've logged the fallback warning (only log once)
 */
let fallbackWarningLogged = false

/**
 * TTL for workflow state entries (2 hours)
 */
const WORKFLOW_TTL_SECONDS = 2 * 60 * 60

/**
 * Redis key prefix for workflow state
 */
function getWorkflowKey(invocationId: string): string {
  return `wf:${invocationId}`
}

/**
 * Redis pub/sub channel for cancellation signals
 */
function getControlChannel(invocationId: string): string {
  return `${getWorkflowKey(invocationId)}:control`
}

/**
 * Set workflow state in Redis (with fallback to memory)
 */
export async function setWorkflowState(invocationId: string, entry: Partial<WorkflowStateEntry>): Promise<void> {
  const redis = getRedisClient()

  if (redis && isRedisAvailable()) {
    try {
      const key = getWorkflowKey(invocationId)

      // Convert entry to string fields for Redis HSET
      const fields: Record<string, string> = {}
      for (const [k, v] of Object.entries(entry)) {
        if (v !== undefined) {
          fields[k] = String(v)
        }
      }

      await redis.hset(key, fields)
      await redis.expire(key, WORKFLOW_TTL_SECONDS)

      console.log(`[WorkflowState] Set in Redis: ${invocationId}`, entry)
    } catch (error) {
      console.error("[WorkflowState] Redis HSET failed, falling back to memory:", error)
      // Fall through to memory store
    }
  } else if (!fallbackWarningLogged) {
    // Log warning once that Redis is unavailable
    console.warn("[WorkflowState] ⚠️  Redis unavailable - using in-memory fallback (state not shared across servers)")
    fallbackWarningLogged = true
  }

  // Always maintain memory store as backup
  const existing = memoryStore.get(invocationId) || {
    state: "running",
    desired: "running",
    createdAt: Date.now(),
    startedAt: Date.now(),
  }
  memoryStore.set(invocationId, { ...existing, ...entry })
}

/**
 * Get workflow state from Redis (with fallback to memory)
 */
export async function getWorkflowState(invocationId: string): Promise<WorkflowStateEntry | null> {
  const redis = getRedisClient()

  if (redis && isRedisAvailable()) {
    try {
      const key = getWorkflowKey(invocationId)
      const data = await redis.hgetall(key)

      if (data && Object.keys(data).length > 0) {
        // Parse Redis string fields back to typed entry
        return {
          state: data.state as WorkflowState,
          desired: data.desired as WorkflowState,
          createdAt: Number.parseInt(data.createdAt, 10),
          cancelRequestedAt: data.cancelRequestedAt ? Number.parseInt(data.cancelRequestedAt, 10) : undefined,
          startedAt: Number.parseInt(data.startedAt, 10),
        }
      }
    } catch (error) {
      console.error("[WorkflowState] Redis HGETALL failed, falling back to memory:", error)
    }
  }

  // Fallback to memory store
  return memoryStore.get(invocationId) || null
}

/**
 * Delete workflow state from Redis and memory
 */
export async function deleteWorkflowState(invocationId: string): Promise<void> {
  const redis = getRedisClient()

  if (redis && isRedisAvailable()) {
    try {
      await redis.del(getWorkflowKey(invocationId))
    } catch (error) {
      console.error("[WorkflowState] Redis DEL failed:", error)
    }
  }

  memoryStore.delete(invocationId)
}

/**
 * Publish cancellation signal via Redis pub/sub
 * Returns true if published successfully
 */
export async function publishCancellation(invocationId: string): Promise<boolean> {
  const redis = getRedisClient()

  if (redis && isRedisAvailable()) {
    try {
      const channel = getControlChannel(invocationId)
      const subscribers = await redis.publish(channel, "cancel")
      console.log(`[WorkflowState] Published cancel to ${subscribers} subscriber(s)`)
      return subscribers > 0
    } catch (error) {
      console.error("[WorkflowState] Redis PUBLISH failed:", error)
      return false
    }
  }

  // No pub/sub without Redis
  return false
}

/**
 * Subscribe to cancellation signals for a workflow
 * Returns unsubscribe function
 */
export async function subscribeToCancellation(
  invocationId: string,
  onCancel: () => void,
): Promise<() => Promise<void>> {
  const redis = getRedisClient()

  if (!redis || !isRedisAvailable()) {
    // No-op unsubscribe if Redis not available
    return async () => {}
  }

  // Create a duplicate connection for pub/sub (ioredis requirement)
  const subscriber = redis.duplicate()
  const channel = getControlChannel(invocationId)

  try {
    await subscriber.subscribe(channel)
    console.log(`[WorkflowState] Subscribed to channel: ${channel}`)

    subscriber.on("message", (ch, message) => {
      if (ch === channel && message === "cancel") {
        console.log(`[WorkflowState] Received cancel signal for ${invocationId}`)
        onCancel()
      }
    })

    // Return unsubscribe function
    return async () => {
      try {
        await subscriber.unsubscribe(channel)
        await subscriber.quit()
        console.log(`[WorkflowState] Unsubscribed from channel: ${channel}`)
      } catch (error) {
        console.error("[WorkflowState] Unsubscribe failed:", error)
      }
    }
  } catch (error) {
    console.error("[WorkflowState] Subscribe failed:", error)
    // Return no-op unsubscribe
    return async () => {}
  }
}

/**
 * Cleanup stale workflow entries (TTL enforcement for memory store)
 * Called periodically by background job
 */
export function cleanupStaleEntries(): void {
  const now = Date.now()
  const maxAge = WORKFLOW_TTL_SECONDS * 1000

  for (const [id, entry] of memoryStore.entries()) {
    if (now - entry.createdAt > maxAge) {
      memoryStore.delete(id)
      console.log(`[WorkflowState] Cleaned up stale entry: ${id}`)
    }
  }
}

// Start periodic cleanup (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
const cleanupTimer = setInterval(cleanupStaleEntries, CLEANUP_INTERVAL)
cleanupTimer.unref() // Don't keep process alive
