"use client"

import { PlayCircle } from "lucide-react"
import { useEffect, useState } from "react"
import { LogEntry } from "./LogEntry"
import { generateMockLogs } from "./mock-data"
import type { LogEntry as LogEntryType } from "./types"

interface ExecutionLogsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ExecutionLogsPanel({ isOpen, onClose }: ExecutionLogsPanelProps) {
  const [logs, setLogs] = useState<LogEntryType[]>([])

  // Load mock data on mount
  useEffect(() => {
    setLogs(generateMockLogs())
  }, [])

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
      </div>

      {/* Logs Content */}
      <div className="overflow-y-auto" style={{ height: "calc(100% - 48px)" }}>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <PlayCircle className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No execution logs yet</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Run your workflow to see what happens</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {logs.map(log => (
              <LogEntry key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
