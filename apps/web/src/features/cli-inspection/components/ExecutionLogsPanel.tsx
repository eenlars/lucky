"use client"

import { useExecutionStore } from "@/features/react-flow-visualization/store/execution-store"
import { ArrowDown, PlayCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { useAutoScroll } from "../hooks/use-auto-scroll"
import { useLogEngine } from "../hooks/use-log-engine"
import { useSessionManager } from "../hooks/use-session-manager"
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

  // Log computation engine (pure functions + memoization)
  const engine = useLogEngine(events, {
    filters: { nodes: selectedNodes, types: selectedTypes },
    searchQuery,
  })

  // Auto-scroll behavior
  const scroll = useAutoScroll(engine.filteredLogs.length, searchQuery !== "")

  // Session persistence
  const session = useSessionManager(workflowId, currentInvocationId, engine.logs, isExecuting, setLocalLogs)

  // Use local logs if a historical session is selected, otherwise use live logs
  const displayLogs =
    session.currentSessionId === currentInvocationId || !session.currentSessionId ? engine.filteredLogs : localLogs

  // Auto-scroll to current search match
  useEffect(() => {
    if (engine.searchMatches.length > 0 && scroll.scrollContainerRef.current) {
      const matchIndex = engine.searchMatches[currentMatchIndex]
      const matchElement = scroll.scrollContainerRef.current.children[0]?.children[matchIndex] as HTMLElement
      if (matchElement) {
        matchElement.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [currentMatchIndex, engine.searchMatches, scroll.scrollContainerRef])

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
          availableNodes={engine.availableNodes}
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
          totalMatches={engine.searchMatches.length}
          onPrevMatch={() => setCurrentMatchIndex(prev => (prev > 0 ? prev - 1 : engine.searchMatches.length - 1))}
          onNextMatch={() => setCurrentMatchIndex(prev => (prev < engine.searchMatches.length - 1 ? prev + 1 : 0))}
          onClear={() => setSearchQuery("")}
        />
      </div>

      {/* Logs Content */}
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
              {engine.isEmpty ? "No execution logs yet" : "No logs match filters"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {engine.isEmpty ? "Run your workflow to see what happens" : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {displayLogs.map((log, index) => {
                const isMatch = engine.searchMatches.includes(index)
                const isCurrentMatch = engine.searchMatches[currentMatchIndex] === index
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
    </div>
  )
}
