import type { WorkflowProgressEvent } from "@lucky/shared"
import { create } from "zustand"

/**
 * Node execution status in the workflow visualization.
 * - pending: Node hasn't started yet
 * - running: Node is currently executing
 * - done: Node completed successfully
 * - error: Node failed with an error
 */
export type NodeExecutionStatus = "pending" | "running" | "done" | "error"

/**
 * Execution state for a single node in the workflow.
 */
export interface NodeExecutionState {
  /** Current execution status of the node */
  status: NodeExecutionStatus
  /** Truncated output preview (max 200 chars) */
  output?: string
  /** Time taken to execute the node in milliseconds */
  durationMs?: number
  /** Cost of executing the node in USD */
  costUsd?: number
  /** Error message if node failed */
  error?: string
  /** Timestamp when the node started */
  startedAt?: number
  /** Timestamp when the node completed or failed */
  completedAt?: number
}

/**
 * Global execution state store for workflow visualization.
 * Tracks the execution status of all nodes in real-time during workflow runs.
 */
interface ExecutionState {
  /** Map of nodeId to execution state */
  nodes: Record<string, NodeExecutionState>
  /** Current workflow invocation ID being tracked */
  workflowInvocationId: string | null
  /** Whether a workflow is currently executing */
  isExecuting: boolean

  /** Update the execution state of a specific node */
  updateNode: (nodeId: string, update: Partial<NodeExecutionState>) => void

  /** Handle incoming progress events from the workflow execution */
  handleProgressEvent: (event: WorkflowProgressEvent) => void

  /** Start tracking a new workflow execution */
  startExecution: (workflowInvocationId: string) => void

  /** Stop tracking the current workflow execution and reset state */
  reset: () => void
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  nodes: {},
  workflowInvocationId: null,
  isExecuting: false,

  updateNode: (nodeId, update) =>
    set(state => ({
      nodes: {
        ...state.nodes,
        [nodeId]: { ...state.nodes[nodeId], ...update },
      },
    })),

  handleProgressEvent: event => {
    const state = get()

    // Ignore events from different workflow invocations
    if (state.workflowInvocationId && event.workflowInvocationId !== state.workflowInvocationId) {
      return
    }

    switch (event.type) {
      case "node_started":
        state.updateNode(event.nodeId, {
          status: "running",
          startedAt: event.timestamp,
        })
        break

      case "node_completed":
        state.updateNode(event.nodeId, {
          status: "done",
          output: event.output,
          durationMs: event.durationMs,
          costUsd: event.costUsd,
          completedAt: event.timestamp,
        })
        break

      case "node_failed":
        state.updateNode(event.nodeId, {
          status: "error",
          error: event.error,
          completedAt: event.timestamp,
        })
        break
    }
  },

  startExecution: workflowInvocationId =>
    set({
      workflowInvocationId,
      isExecuting: true,
      nodes: {},
    }),

  reset: () =>
    set({
      nodes: {},
      workflowInvocationId: null,
      isExecuting: false,
    }),
}))
