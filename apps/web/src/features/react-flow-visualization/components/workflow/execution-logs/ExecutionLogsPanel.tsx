"use client"

import { useExecutionStore } from "@/features/react-flow-visualization/store/execution-store"
import type { WorkflowProgressEvent } from "@lucky/shared"
import { ArrowDown, PlayCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { LogEntry } from "./LogEntry"
import type { LogEntry as LogEntryType } from "./types"

interface ExecutionLogsPanelProps {
  isOpen: boolean
  onClose: () => void
}

function convertEventToLog(event: WorkflowProgressEvent, index: number): LogEntryType | null {
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

export function ExecutionLogsPanel({ isOpen, onClose }: ExecutionLogsPanelProps) {
  const { events, isExecuting } = useExecutionStore()
  const [logs, setLogs] = useState<LogEntryType[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [newLogCount, setNewLogCount] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const prevScrollHeight = useRef(0)

  // Convert events to logs
  useEffect(() => {
    const convertedLogs = events
      .map((event, index) => convertEventToLog(event, index))
      .filter(Boolean) as LogEntryType[]
    setLogs(convertedLogs)
  }, [events])

  // Auto-scroll logic
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    if (autoScroll) {
      // Smooth scroll to bottom
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      })
      prevScrollHeight.current = container.scrollHeight
      setNewLogCount(0)
    } else {
      // Count new logs when not auto-scrolling
      const heightDiff = container.scrollHeight - prevScrollHeight.current
      if (heightDiff > 0) {
        setNewLogCount(prev => prev + 1)
      }
      prevScrollHeight.current = container.scrollHeight
    }
  }, [logs, autoScroll])

  // Detect manual scroll
  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (!container) return

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50
    setAutoScroll(isAtBottom)

    if (isAtBottom) {
      setNewLogCount(0)
    }
  }

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  // Find active node (node_started event without matching node_completed)
  const nodeStartedEvents = events.filter(e => e.type === "node_started")
  const nodeCompletedEvents = events.filter(e => e.type === "node_completed")
  const activeNode = nodeStartedEvents
    .slice()
    .reverse()
    .find(startEvent => !nodeCompletedEvents.some(completeEvent => completeEvent.nodeId === startEvent.nodeId))
  const activeNodeId = activeNode?.nodeId

  if (!isOpen) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[oklch(0.15_0_0)] border-t border-gray-200 dark:border-white/10 shadow-lg z-40"
      style={{
        height: "30vh",
        minHeight: "200px",
        maxHeight: "60vh",
      }}
    >
      {/* Toolbar */}
      <div className="h-12 px-4 flex items-center gap-3 bg-gray-50 dark:bg-[oklch(0.13_0_0)] border-b border-gray-200 dark:border-white/10">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Execution Logs</h2>
        {isExecuting && <span className="text-xs text-gray-500 dark:text-gray-400">(Running...)</span>}
      </div>

      {/* Logs Content */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="overflow-y-auto relative"
        style={{ height: "calc(100% - 48px)" }}
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <PlayCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No execution logs yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Run your workflow to see what happens</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {logs.map(log => (
                <LogEntry key={log.id} log={log} />
              ))}

              {/* Typing Indicator */}
              {isExecuting && activeNodeId && (
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="w-4 h-4 flex-shrink-0" />
                  <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 w-[14ch] flex-shrink-0">
                    ...
                  </span>
                  <span
                    className="text-sm font-medium px-2 py-0.5 rounded border flex-shrink-0"
                    style={{
                      backgroundColor: "#8b5cf61A",
                      borderColor: "#8b5cf64D",
                      color: "#8b5cf6",
                    }}
                  >
                    {activeNodeId}
                  </span>
                  <div className="flex gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"
                      style={{ animationDelay: "200ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-pulse"
                      style={{ animationDelay: "400ms" }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Jump to Latest Button */}
            {!autoScroll && (
              <button
                type="button"
                onClick={() => setAutoScroll(true)}
                className="fixed bottom-[calc(30vh+16px)] right-6 flex items-center gap-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                <ArrowDown className="w-4 h-4" />
                {newLogCount > 0 && <span className="text-xs font-medium">{newLogCount} new</span>}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
