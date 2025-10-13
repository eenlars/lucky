"use client"

import type { WorkflowProgressEvent } from "@lucky/shared"
import { create } from "zustand"

/**
 * Execution store for tracking workflow execution state and handling cancellation.
 */
interface ExecutionState {
  isExecuting: boolean
  isCancelling: boolean
  currentInvocationId: string | null
  totalCost: number
  totalDuration: number
  completedNodes: number
  events: WorkflowProgressEvent[]
}

interface ExecutionActions {
  /**
   * Start tracking a new workflow execution
   */
  startExecution: (invocationId: string) => void

  /**
   * Cancel the currently executing workflow
   */
  cancel: (invocationId: string) => Promise<void>

  /**
   * Handle a progress event from the workflow
   */
  handleEvent: (event: WorkflowProgressEvent) => void

  /**
   * Reset the execution state
   */
  reset: () => void
}

export type ExecutionStore = ExecutionState & ExecutionActions

const initialState: ExecutionState = {
  isExecuting: false,
  isCancelling: false,
  currentInvocationId: null,
  totalCost: 0,
  totalDuration: 0,
  completedNodes: 0,
  events: [],
}

export const useExecutionStore = create<ExecutionStore>((set, get) => ({
  ...initialState,

  startExecution: (invocationId: string) => {
    set({
      isExecuting: true,
      isCancelling: false,
      currentInvocationId: invocationId,
      totalCost: 0,
      totalDuration: 0,
      completedNodes: 0,
      events: [],
    })
  },

  cancel: async (invocationId: string) => {
    set({ isCancelling: true })

    try {
      const response = await fetch(`/api/workflow/cancel/${invocationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      // API always returns 202, check status in body
      const result = await response.json()

      if (result.status === "cancelling") {
        console.log("[ExecutionStore] Cancellation requested successfully")
        // State stays isCancelling=true until workflow_cancelled event
      } else if (result.status === "already_cancelled") {
        console.log("[ExecutionStore] Workflow already cancelled")
        set({ isCancelling: false, isExecuting: false })
      } else if (result.status === "not_found") {
        console.warn("[ExecutionStore] Workflow not found:", result.message)
        set({ isCancelling: false, isExecuting: false })
      } else {
        console.log(`[ExecutionStore] Cancel status: ${result.status}`)
      }
    } catch (error) {
      console.error("[ExecutionStore] Cancel request failed:", error)
      // Reset isCancelling on network error
      set({ isCancelling: false })
      throw error
    }
  },

  handleEvent: (event: WorkflowProgressEvent) => {
    const currentEvents = get().events

    set({
      events: [...currentEvents, event],
    })

    switch (event.type) {
      case "workflow_started":
        set({
          isExecuting: true,
          isCancelling: false,
        })
        break

      case "node_completed":
        set({
          completedNodes: get().completedNodes + 1,
          totalCost: get().totalCost + event.cost,
        })
        break

      case "workflow_cancelling":
        // Immediate feedback: user clicked cancel
        set({
          isCancelling: true,
        })
        console.log("[ExecutionStore] Cancellation in progress...")
        break

      case "workflow_cancelled":
        // Final cancellation state
        set({
          isExecuting: false,
          isCancelling: false,
          totalCost: event.partialResults.totalCost,
          totalDuration: event.partialResults.totalDuration,
          completedNodes: event.partialResults.completedNodes,
        })
        console.log(`[ExecutionStore] Workflow cancelled at node ${event.cancelledAt}`)
        break

      case "workflow_completed":
        set({
          isExecuting: false,
          isCancelling: false,
          totalCost: event.totalCost,
          totalDuration: event.totalDuration,
          completedNodes: event.completedNodes,
        })
        break

      case "workflow_failed":
        set({
          isExecuting: false,
          isCancelling: false,
          totalCost: event.totalCost,
          totalDuration: event.totalDuration,
        })
        break
    }
  },

  reset: () => {
    set(initialState)
  },
}))
