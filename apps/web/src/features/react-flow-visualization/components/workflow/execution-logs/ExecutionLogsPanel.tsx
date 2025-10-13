"use client"

import { useExecutionStore } from "@/features/react-flow-visualization/store/execution-store"
import type { WorkflowProgressEvent } from "@lucky/shared"
import { ArrowDown, PlayCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { LogEntry } from "./LogEntry"
import { LogFilters } from "./LogFilters"
import { LogSearch } from "./LogSearch"
import { SessionSelector } from "./SessionSelector"
import { clearAllSessions, loadSessions, saveSession } from "./sessionManager"
import type { ExecutionSession, LogEntry as LogEntryType, LogType } from "./types"

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
  const { events, isExecuting, currentInvocationId } = useExecutionStore()
  const [logs, setLogs] = useState<LogEntryType[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntryType[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [newLogCount, setNewLogCount] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const prevScrollHeight = useRef(0)

  // Phase 4: Filter state
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<LogType[]>([])

  // Phase 4: Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [searchMatches, setSearchMatches] = useState<number[]>([])
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)

  // Phase 5: Session state
  const [sessions, setSessions] = useState<ExecutionSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const workflowId = "default" // TODO: Get from context

  // Load sessions on mount
  useEffect(() => {
    const loadedSessions = loadSessions(workflowId)
    setSessions(loadedSessions)
  }, [workflowId])

  // Convert events to logs
  useEffect(() => {
    const convertedLogs = events
      .map((event, index) => convertEventToLog(event, index))
      .filter(Boolean) as LogEntryType[]
    setLogs(convertedLogs)

    // Update or create current session
    if (currentInvocationId && convertedLogs.length > 0) {
      const session: ExecutionSession = {
        id: currentInvocationId,
        startTime: convertedLogs[0].timestamp,
        endTime: isExecuting ? undefined : new Date(),
        status: isExecuting ? "running" : "success",
        nodeCount: convertedLogs.filter(l => l.type === "SUCCESS" && l.nodeId !== "end").length,
        totalCost: convertedLogs.reduce((sum, log) => sum + (log.cost || 0), 0),
        logs: convertedLogs,
      }

      saveSession(workflowId, session)
      setCurrentSessionId(currentInvocationId)
      setSessions(loadSessions(workflowId))
    }
  }, [events, currentInvocationId, isExecuting, workflowId])

  // Phase 4: Apply filters
  useEffect(() => {
    let filtered = logs

    if (selectedNodes.length > 0) {
      filtered = filtered.filter(log => selectedNodes.includes(log.nodeId))
    }

    if (selectedTypes.length > 0) {
      filtered = filtered.filter(log => selectedTypes.includes(log.type))
    }

    setFilteredLogs(filtered)
  }, [logs, selectedNodes, selectedTypes])

  // Phase 4: Search and highlight
  useEffect(() => {
    if (!searchQuery) {
      setSearchMatches([])
      setCurrentMatchIndex(0)
      return
    }

    const query = searchQuery.toLowerCase()
    const matches: number[] = []

    filteredLogs.forEach((log, index) => {
      if (log.message.toLowerCase().includes(query)) {
        matches.push(index)
      }
    })

    setSearchMatches(matches)
    setCurrentMatchIndex(0)
  }, [searchQuery, filteredLogs])

  // Auto-scroll to current search match
  useEffect(() => {
    if (searchMatches.length > 0 && scrollContainerRef.current) {
      const matchIndex = searchMatches[currentMatchIndex]
      const matchElement = scrollContainerRef.current.children[0]?.children[matchIndex] as HTMLElement
      if (matchElement) {
        matchElement.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [currentMatchIndex, searchMatches])

  // Auto-scroll logic
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    if (autoScroll && !searchQuery) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      })
      prevScrollHeight.current = container.scrollHeight
      setNewLogCount(0)
    } else if (!autoScroll) {
      const heightDiff = container.scrollHeight - prevScrollHeight.current
      if (heightDiff > 0) {
        setNewLogCount(prev => prev + 1)
      }
      prevScrollHeight.current = container.scrollHeight
    }
  }, [filteredLogs, autoScroll, searchQuery])

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

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (searchQuery) {
          setSearchQuery("")
        } else {
          onClose()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose, searchQuery])

  // Find active node
  const nodeStartedEvents = events.filter(e => e.type === "node_started")
  const nodeCompletedEvents = events.filter(e => e.type === "node_completed")
  const activeNode = nodeStartedEvents
    .slice()
    .reverse()
    .find(startEvent => !nodeCompletedEvents.some(completeEvent => completeEvent.nodeId === startEvent.nodeId))
  const activeNodeId = activeNode?.nodeId

  // Get available nodes for filter
  const availableNodes = Array.from(new Set(logs.map(log => log.nodeId)))

  // Session management handlers
  const handleSessionSelect = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setLogs(session.logs)
      setCurrentSessionId(sessionId)
    }
  }

  const handleClearHistory = () => {
    clearAllSessions(workflowId)
    setSessions([])
    setCurrentSessionId(null)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed bottom-0 left-[70px] right-0 bg-white dark:bg-[oklch(0.15_0_0)] border-t border-gray-200 dark:border-white/10 shadow-lg z-40"
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

        <div className="flex-1" />

        {/* Phase 5: Session Selector */}
        {sessions.length > 0 && (
          <SessionSelector
            sessions={sessions}
            currentSessionId={currentSessionId}
            onSessionSelect={handleSessionSelect}
            onClearHistory={handleClearHistory}
          />
        )}

        {/* Phase 4: Filters */}
        <LogFilters
          selectedNodes={selectedNodes}
          selectedTypes={selectedTypes}
          availableNodes={availableNodes}
          onNodesChange={setSelectedNodes}
          onTypesChange={setSelectedTypes}
          onClearAll={() => {
            setSelectedNodes([])
            setSelectedTypes([])
          }}
        />

        {/* Phase 4: Search */}
        <LogSearch
          query={searchQuery}
          onQueryChange={setSearchQuery}
          currentMatch={currentMatchIndex}
          totalMatches={searchMatches.length}
          onPrevMatch={() => setCurrentMatchIndex(prev => (prev > 0 ? prev - 1 : searchMatches.length - 1))}
          onNextMatch={() => setCurrentMatchIndex(prev => (prev < searchMatches.length - 1 ? prev + 1 : 0))}
          onClear={() => setSearchQuery("")}
        />
      </div>

      {/* Logs Content */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="overflow-y-auto relative"
        style={{ height: "calc(100% - 48px)" }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <PlayCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {logs.length === 0 ? "No execution logs yet" : "No logs match filters"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {logs.length === 0 ? "Run your workflow to see what happens" : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {filteredLogs.map((log, index) => {
                const isMatch = searchMatches.includes(index)
                const isCurrentMatch = searchMatches[currentMatchIndex] === index
                return (
                  <div
                    key={log.id}
                    className={
                      isMatch
                        ? isCurrentMatch
                          ? "bg-yellow-100 dark:bg-yellow-900/20"
                          : "bg-yellow-50 dark:bg-yellow-900/10"
                        : ""
                    }
                  >
                    <LogEntry log={log} />
                  </div>
                )
              })}

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
            {!autoScroll && !searchQuery && (
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
