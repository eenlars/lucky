import { z } from "zod"

/**
 * Schema version for workflow progress events
 * Increment when making breaking changes to event structure
 */
export const WORKFLOW_PROGRESS_SCHEMA_VERSION = 1

/**
 * Base fields common to all workflow progress events
 */
const baseEventSchema = z.object({
  schemaVersion: z.literal(WORKFLOW_PROGRESS_SCHEMA_VERSION),
  timestamp: z.number(),
  workflowInvocationId: z.string(),
})

/**
 * Event emitted when cancellation is requested (immediate UX feedback)
 */
const workflowCancellingEvent = baseEventSchema.extend({
  type: z.literal("workflow_cancelling"),
  cancelRequestedAt: z.number(), // When cancel was requested
})

/**
 * Event emitted when a workflow is cancelled
 */
const workflowCancelledEvent = baseEventSchema.extend({
  type: z.literal("workflow_cancelled"),
  cancelledAt: z.string(), // nodeId where cancellation occurred
  cancelRequestedAt: z.number(), // When cancel was requested
  reason: z.enum(["user_requested", "timeout", "error"]).default("user_requested"),
  partialResults: z.object({
    completedNodes: z.number(),
    totalCost: z.number(),
    totalDuration: z.number(),
  }),
})

/**
 * Event emitted when a node starts execution
 */
const nodeStartedEvent = baseEventSchema.extend({
  type: z.literal("node_started"),
  nodeId: z.string(),
})

/**
 * Event emitted when a node completes execution
 */
const nodeCompletedEvent = baseEventSchema.extend({
  type: z.literal("node_completed"),
  nodeId: z.string(),
  cost: z.number(),
  duration: z.number(),
})

/**
 * Event emitted when a workflow starts
 */
const workflowStartedEvent = baseEventSchema.extend({
  type: z.literal("workflow_started"),
})

/**
 * Event emitted when a workflow completes successfully
 */
const workflowCompletedEvent = baseEventSchema.extend({
  type: z.literal("workflow_completed"),
  totalCost: z.number(),
  totalDuration: z.number(),
  completedNodes: z.number(),
})

/**
 * Event emitted when a workflow fails
 */
const workflowFailedEvent = baseEventSchema.extend({
  type: z.literal("workflow_failed"),
  error: z.string(),
  totalCost: z.number(),
  totalDuration: z.number(),
})

/**
 * Discriminated union of all workflow progress events
 */
export const workflowProgressEventSchema = z.discriminatedUnion("type", [
  workflowCancellingEvent,
  workflowCancelledEvent,
  nodeStartedEvent,
  nodeCompletedEvent,
  workflowStartedEvent,
  workflowCompletedEvent,
  workflowFailedEvent,
])

/**
 * TypeScript type for workflow progress events
 */
export type WorkflowProgressEvent = z.infer<typeof workflowProgressEventSchema>

/**
 * Type for workflow event handler callbacks
 */
export type WorkflowEventHandler = (event: WorkflowProgressEvent) => void | Promise<void>
