import type { WorkflowProgressEvent } from "@lucky/shared"
import type { LogEntry, LogType } from "../types"

/**
 * Pure functions for log processing (framework-agnostic, easily testable)
 */

export function convertEventToLog(event: WorkflowProgressEvent, index: number): LogEntry | null {
  const timestamp = new Date(event.timestamp)

  switch (event.type) {
    case "workflow_started":
      return {
        id: `log-${index}`,
        timestamp,
        nodeId: "start",
        nodeName: "Start",
        nodeColor: "#3b82f6",
        type: "INFO",
        message: "Workflow execution started",
      }

    case "node_started":
      return {
        id: `log-${index}`,
        timestamp,
        nodeId: event.nodeId,
        nodeName: event.nodeId,
        nodeColor: "#8b5cf6",
        type: "INFO",
        message: "Node started",
      }

    case "node_completed":
      return {
        id: `log-${index}`,
        timestamp,
        nodeId: event.nodeId,
        nodeName: event.nodeId,
        nodeColor: "#8b5cf6",
        type: "SUCCESS",
        message: "Node completed",
        duration: event.duration,
        cost: event.cost,
      }

    case "workflow_completed":
      return {
        id: `log-${index}`,
        timestamp,
        nodeId: "end",
        nodeName: "End",
        nodeColor: "#10b981",
        type: "SUCCESS",
        message: `Workflow completed | Nodes: ${event.completedNodes} | Duration: ${(event.totalDuration / 1000).toFixed(1)}s | Cost: $${event.totalCost.toFixed(2)}`,
      }

    case "workflow_failed":
      return {
        id: `log-${index}`,
        timestamp,
        nodeId: "error",
        nodeName: "Error",
        nodeColor: "#ef4444",
        type: "ERROR",
        message: event.error,
      }

    case "workflow_cancelled":
      return {
        id: `log-${index}`,
        timestamp,
        nodeId: event.cancelledAt,
        nodeName: "Cancelled",
        nodeColor: "#f59e0b",
        type: "WARNING",
        message: `Workflow cancelled at node ${event.cancelledAt} | Reason: ${event.reason} | Completed: ${event.partialResults.completedNodes} nodes`,
      }

    case "workflow_cancelling":
      return {
        id: `log-${index}`,
        timestamp,
        nodeId: "system",
        nodeName: "System",
        nodeColor: "#f59e0b",
        type: "WARNING",
        message: "Cancellation requested...",
      }

    default:
      return null
  }
}

export function convertEventsToLogs(events: WorkflowProgressEvent[]): LogEntry[] {
  return events.map((event, index) => convertEventToLog(event, index)).filter(Boolean) as LogEntry[]
}

export interface FilterConfig {
  nodes: string[]
  types: LogType[]
}

export function filterLogs(logs: LogEntry[], filters: FilterConfig): LogEntry[] {
  let filtered = logs

  if (filters.nodes.length > 0) {
    filtered = filtered.filter(log => filters.nodes.includes(log.nodeId))
  }

  if (filters.types.length > 0) {
    filtered = filtered.filter(log => filters.types.includes(log.type))
  }

  return filtered
}

export interface SearchResult {
  filteredLogs: LogEntry[]
  matches: number[]
}

export function searchLogs(logs: LogEntry[], query: string): SearchResult {
  if (!query) {
    return { filteredLogs: logs, matches: [] }
  }

  const q = query.toLowerCase()
  const matches: number[] = []

  logs.forEach((log, index) => {
    if (log.message.toLowerCase().includes(q)) {
      matches.push(index)
    }
  })

  return { filteredLogs: logs, matches }
}

export function getAvailableNodes(logs: LogEntry[]): string[] {
  return Array.from(new Set(logs.map(log => log.nodeId)))
}

export function findActiveNodeId(events: WorkflowProgressEvent[]): string | undefined {
  const nodeStartedEvents = events.filter(e => e.type === "node_started")
  const nodeCompletedEvents = events.filter(e => e.type === "node_completed")

  const activeNode = nodeStartedEvents
    .slice()
    .reverse()
    .find(startEvent => !nodeCompletedEvents.some(completeEvent => completeEvent.nodeId === startEvent.nodeId))

  return activeNode?.nodeId
}
