/**
 * Agent event emission helpers
 * Emits events to the AgentObserver from observation context
 */

import type { AgentEvent } from "@lucky/shared"
import { getObservationContext } from "../../context/observationContext"

function emitEvent(event: AgentEvent): void {
  const ctx = getObservationContext()
  ctx?.observer.emit(event)
}

export function emitAgentStart(nodeId: string, nodeName: string): void {
  emitEvent({
    type: "agent.start",
    nodeId,
    nodeName,
    timestamp: Date.now(),
  })
}

export function emitAgentEnd(
  nodeId: string,
  duration: number,
  cost: number,
  tokenUsage?: { prompt: number; completion: number },
): void {
  emitEvent({
    type: "agent.end",
    nodeId,
    duration,
    cost,
    tokenUsage,
    timestamp: Date.now(),
  })
}

export function emitAgentError(nodeId: string, error: Error): void {
  emitEvent({
    type: "agent.error",
    nodeId,
    error: error.message,
    stack: error.stack,
    timestamp: Date.now(),
  })
}

export function emitAgentToolStart(nodeId: string, toolName: string, args: Record<string, unknown>): void {
  emitEvent({
    type: "agent.tool.start",
    nodeId,
    toolName,
    args,
    timestamp: Date.now(),
  })
}

export function emitAgentToolEnd(
  nodeId: string,
  toolName: string,
  duration: number,
  result?: unknown,
  error?: string,
): void {
  emitEvent({
    type: "agent.tool.end",
    nodeId,
    toolName,
    duration,
    result,
    error,
    timestamp: Date.now(),
  })
}
