/**
 * React hook for consuming real-time workflow events via SSE
 *
 * Provides type-safe access to workflow execution events including
 * node progress, tool execution, LLM calls, and error states.
 */

"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import type { WorkflowEvent } from "@core/utils/observability/events/WorkflowEvents"

export interface WorkflowStreamOptions {
  invocationId?: string
  nodeId?: string
  events?: string[]
  excludeHeartbeat?: boolean
  autoReconnect?: boolean
  reconnectInterval?: number
}

export interface WorkflowStreamState {
  events: WorkflowEvent[]
  lastEvent: WorkflowEvent | null
  connectionState: "connecting" | "connected" | "disconnected" | "error"
  error: string | null
  connectionId: string | null
  eventCount: number
}

export interface WorkflowProgress {
  completedNodes: number
  totalNodes: number
  currentNodeId: string | null
  percentage: number
  estimatedCompletion?: number
}

/**
 * Hook for streaming workflow events in real-time
 */
export function useWorkflowStream(options: WorkflowStreamOptions = {}) {
  const [state, setState] = useState<WorkflowStreamState>({
    events: [],
    lastEvent: null,
    connectionState: "disconnected",
    error: null,
    connectionId: null,
    eventCount: 0,
  })

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const {
    invocationId,
    nodeId,
    events = [],
    excludeHeartbeat = true,
    autoReconnect = true,
    reconnectInterval = 3000,
  } = options

  // Build SSE URL with query parameters
  const buildUrl = useCallback(() => {
    const params = new URLSearchParams()

    if (invocationId) params.set("invocationId", invocationId)
    if (nodeId) params.set("nodeId", nodeId)
    if (events.length > 0) params.set("events", events.join(","))
    if (excludeHeartbeat) params.set("excludeHeartbeat", "true")

    return `/api/workflow/stream?${params.toString()}`
  }, [invocationId, nodeId, events, excludeHeartbeat])

  // Connect to SSE stream
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setState((prev) => ({
      ...prev,
      connectionState: "connecting",
      error: null,
    }))

    const eventSource = new EventSource(buildUrl())
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setState((prev) => ({
        ...prev,
        connectionState: "connected",
        error: null,
      }))
      reconnectAttempts.current = 0
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        // Handle connection establishment
        if (data.event === "connection:established") {
          setState((prev) => ({
            ...prev,
            connectionId: data.connectionId,
          }))
          return
        }

        // Handle heartbeat events
        if (data.event === "heartbeat") {
          // Heartbeat received, connection is alive
          return
        }

        // Handle workflow events
        const workflowEvent = data as WorkflowEvent
        setState((prev) => ({
          ...prev,
          events: [...prev.events, workflowEvent].slice(-100), // Keep last 100 events
          lastEvent: workflowEvent,
          eventCount: prev.eventCount + 1,
        }))
      } catch (error) {
        console.error("Failed to parse SSE event:", error)
      }
    }

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error)
      setState((prev) => ({
        ...prev,
        connectionState: "error",
        error: "Connection error occurred",
      }))

      eventSource.close()

      // Auto-reconnect logic
      if (autoReconnect && reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, reconnectInterval * reconnectAttempts.current)
      }
    }
  }, [buildUrl, autoReconnect, reconnectInterval])

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setState((prev) => ({
      ...prev,
      connectionState: "disconnected",
    }))
  }, [])

  // Clear events
  const clearEvents = useCallback(() => {
    setState((prev) => ({
      ...prev,
      events: [],
      lastEvent: null,
      eventCount: 0,
    }))
  }, [])

  // Auto-connect on mount and dependency changes
  useEffect(() => {
    connect()
    return disconnect
  }, [connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    ...state,
    connect,
    disconnect,
    clearEvents,
    isConnected: state.connectionState === "connected",
    isConnecting: state.connectionState === "connecting",
    hasError: state.connectionState === "error",
  }
}

/**
 * Hook for tracking workflow progress based on events
 */
export function useWorkflowProgress(invocationId?: string) {
  const { events } = useWorkflowStream({
    invocationId,
    events: [
      "workflow:started",
      "workflow:progress",
      "workflow:completed",
      "node:execution:completed",
    ],
  })

  const [progress, setProgress] = useState<WorkflowProgress>({
    completedNodes: 0,
    totalNodes: 0,
    currentNodeId: null,
    percentage: 0,
  })

  useEffect(() => {
    const workflowStarted = events.find((e) => e.event === "workflow:started")
    const workflowCompleted = events.find(
      (e) => e.event === "workflow:completed"
    )
    const nodeCompletions = events.filter(
      (e) => e.event === "node:execution:completed"
    )
    const progressEvents = events.filter((e) => e.event === "workflow:progress")

    if (workflowStarted) {
      const totalNodes = (workflowStarted as any).nodeCount || 0
      const completedNodes = nodeCompletions.length
      const percentage =
        totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0

      // Get current node from latest progress event or latest node completion
      const latestProgress = progressEvents[progressEvents.length - 1] as any
      const latestCompletion = nodeCompletions[
        nodeCompletions.length - 1
      ] as any
      const currentNodeId =
        latestProgress?.currentNodeId || latestCompletion?.nodeId || null

      setProgress({
        completedNodes,
        totalNodes,
        currentNodeId,
        percentage: workflowCompleted ? 100 : percentage,
        estimatedCompletion: latestProgress?.estimatedCompletion,
      })
    }
  }, [events])

  return progress
}

/**
 * Hook for tracking node-specific events
 */
export function useNodeEvents(nodeId: string, invocationId?: string) {
  const { events } = useWorkflowStream({
    nodeId,
    invocationId,
    events: [
      "node:execution:started",
      "node:execution:completed",
      "tool:execution:started",
      "tool:execution:completed",
      "llm:call:started",
      "llm:call:completed",
    ],
  })

  const nodeEvents = events.filter(
    (event: any) => event.nodeId === nodeId || event.toNodeId === nodeId
  )

  const isExecuting = nodeEvents.some(
    (event: any) =>
      event.event === "node:execution:started" &&
      !nodeEvents.some(
        (e: any) =>
          e.event === "node:execution:completed" && e.nodeId === event.nodeId
      )
  )

  const lastExecution = nodeEvents
    .filter((event: any) => event.event === "node:execution:completed")
    .pop()

  return {
    events: nodeEvents,
    isExecuting,
    lastExecution,
    toolCalls: nodeEvents.filter((event: any) =>
      event.event.startsWith("tool:")
    ),
    llmCalls: nodeEvents.filter((event: any) => event.event.startsWith("llm:")),
  }
}
