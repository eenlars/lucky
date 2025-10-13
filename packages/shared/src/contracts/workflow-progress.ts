import { z } from "zod"

/**
 * Current schema version for workflow progress events.
 * Increment when making breaking changes to event structure.
 */
export const WORKFLOW_PROGRESS_SCHEMA_VERSION = 1

/**
 * Workflow progress event schema with discriminated union for type safety.
 * All events include schemaVersion for future-proofing.
 */
export const WorkflowProgressEventSchema = z.discriminatedUnion("type", [
  /**
   * Emitted immediately before a node begins execution.
   */
  z.object({
    type: z.literal("node_started"),
    schemaVersion: z.literal(WORKFLOW_PROGRESS_SCHEMA_VERSION),
    nodeId: z.string(),
    nodeName: z.string(),
    timestamp: z.number(),
    workflowInvocationId: z.string(),
  }),

  /**
   * Emitted after a node successfully completes execution.
   * Output is truncated to 200 characters max.
   */
  z.object({
    type: z.literal("node_completed"),
    schemaVersion: z.literal(WORKFLOW_PROGRESS_SCHEMA_VERSION),
    nodeId: z.string(),
    nodeName: z.string(),
    output: z.string().max(203), // 200 + "..."
    durationMs: z.number(),
    costUsd: z.number(),
    timestamp: z.number(),
    workflowInvocationId: z.string(),
  }),

  /**
   * Emitted when a node fails during execution.
   */
  z.object({
    type: z.literal("node_failed"),
    schemaVersion: z.literal(WORKFLOW_PROGRESS_SCHEMA_VERSION),
    nodeId: z.string(),
    nodeName: z.string(),
    error: z.string(),
    timestamp: z.number(),
    workflowInvocationId: z.string(),
  }),
])

export type WorkflowProgressEvent = z.infer<typeof WorkflowProgressEventSchema>
