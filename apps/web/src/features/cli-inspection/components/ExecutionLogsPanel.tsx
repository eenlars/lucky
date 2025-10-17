"use client"

import { useExecutionStore } from "@/features/react-flow-visualization/store/execution-store"
import { ArrowDown, ChevronDown, ChevronUp, PlayCircle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useAutoScroll } from "../hooks/use-auto-scroll"
import { useLogEngine } from "../hooks/use-log-engine"
import { useSessionManager } from "../hooks/use-session-manager"
import { filterLogs, getAvailableNodes, searchLogs } from "../lib/log-engine"
import type { LogEntry as LogEntryType, LogType } from "../types"
import { LogEntry } from "./LogEntry"
import { LogFilters } from "./LogFilters"
import { LogSearch } from "./LogSearch"
import { SessionSelector } from "./SessionSelector"

interface ExecutionLogsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ExecutionLogsPanel({ isOpen, onClose }: ExecutionLogsPanelProps) {
  const { events, isExecuting, currentInvocationId } = useExecutionStore()
  const workflowId = "default" // TODO: Get from context

  // Local state for filters and search
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [selectedTypes, setSelectedTypes] = useState<LogType[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [localLogs, setLocalLogs] = useState<LogEntryType[]>([])
  const [isMinimized, setIsMinimized] = useState(false)

  // Log computation engine (pure functions + memoization)
  const engine = useLogEngine(events, {
    filters: { nodes: selectedNodes, types: selectedTypes },
    searchQuery,
  })

  // Session persistence
  const session = useSessionManager(workflowId, currentInvocationId, engine.logs, isExecuting, setLocalLogs)

  // Determine if viewing historical session
  const isViewingHistory = session.currentSessionId !== currentInvocationId && session.currentSessionId !== null

  // Apply filters and search to historical logs if viewing history
  const historicalFilteredLogs = useMemo(() => {
    if (!isViewingHistory) return []
    return filterLogs(localLogs, { nodes: selectedNodes, types: selectedTypes })
  }, [isViewingHistory, localLogs, selectedNodes, selectedTypes])

  const historicalSearchResult = useMemo(() => {
    if (!isViewingHistory) return { filteredLogs: [], matches: [] }
    return searchLogs(historicalFilteredLogs, searchQuery)
  }, [isViewingHistory, historicalFilteredLogs, searchQuery])

  const historicalAvailableNodes = useMemo(() => {
    if (!isViewingHistory) return []
    return getAvailableNodes(localLogs)
  }, [isViewingHistory, localLogs])

  // Use historical data if viewing history, otherwise use engine (live) data
  const displayLogs = isViewingHistory ? historicalSearchResult.filteredLogs : engine.filteredLogs
  const searchMatches = isViewingHistory ? historicalSearchResult.matches : engine.searchMatches
  const availableNodes = isViewingHistory ? historicalAvailableNodes : engine.availableNodes
  const isEmpty = isViewingHistory ? localLogs.length === 0 : engine.isEmpty

  // Auto-scroll behavior
  const scroll = useAutoScroll(displayLogs.length, searchQuery !== "")

  // Auto-scroll to current search match
  useEffect(() => {
    if (searchMatches.length > 0 && scroll.scrollContainerRef.current) {
      const matchIndex = searchMatches[currentMatchIndex]
      const matchElement = scroll.scrollContainerRef.current.children[0]?.children[matchIndex] as HTMLElement
      if (matchElement) {
        matchElement.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [currentMatchIndex, searchMatches, scroll.scrollContainerRef])

  // Handle Escape key (clear search or close panel)
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

  if (!isOpen) return null

  return (
    <div
      className="fixed bottom-0 left-[70px] right-0 bg-white dark:bg-[oklch(0.15_0_0)] border-t border-gray-200 dark:border-white/10 shadow-lg z-40 transition-all duration-200"
      style={
        isMinimized
          ? {
              height: "48px",
            }
          : {
              height: "30vh",
              minHeight: "200px",
              maxHeight: "60vh",
            }
      }
    >
      {/* Toolbar */}
      <div className="h-12 px-4 flex items-center gap-3 bg-gray-50 dark:bg-[oklch(0.13_0_0)] border-b border-gray-200 dark:border-white/10">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Execution Logs</h2>
        {isExecuting && <span className="text-xs text-gray-500 dark:text-gray-400">(Running...)</span>}

        {/* Minimize/Expand Button */}
        <button
          type="button"
          onClick={() => setIsMinimized(!isMinimized)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors"
          title={isMinimized ? "Expand" : "Minimize"}
        >
          {isMinimized ? (
            <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        <div className="flex-1" />

        {/* Session Selector */}
        {session.sessions.length > 0 && (
          <SessionSelector
            sessions={session.sessions}
            currentSessionId={session.currentSessionId}
            onSessionSelect={session.handleSessionSelect}
            onClearHistory={session.handleClearHistory}
          />
        )}

        {/* Filters */}
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

        {/* Search */}
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
      {!isMinimized && (
        <div
          ref={scroll.scrollContainerRef}
          onScroll={scroll.handleScroll}
          className="overflow-y-auto relative"
          style={{ height: "calc(100% - 48px)" }}
        >
          {displayLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <PlayCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {isEmpty ? "No execution logs yet" : "No logs match filters"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isEmpty ? "Run your workflow to see what happens" : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {displayLogs.map((log, index) => {
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
                {isExecuting && engine.activeNodeId && (
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
                      {engine.activeNodeId}
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
              {!scroll.autoScroll && !searchQuery && (
                <button
                  type="button"
                  onClick={() => scroll.setAutoScroll(true)}
                  className="fixed bottom-[calc(30vh+16px)] right-6 flex items-center gap-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                >
                  <ArrowDown className="w-4 h-4" />
                  {scroll.newLogCount > 0 && <span className="text-xs font-medium">{scroll.newLogCount} new</span>}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
