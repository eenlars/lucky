"use client"

import type { AppNode } from "@/features/react-flow-visualization/components/nodes/nodes"
import { cn } from "@/lib/utils"
import { History, Play } from "lucide-react"
import { useState } from "react"

interface QuickActionsFooterProps {
  node: AppNode
}

export function QuickActionsFooter({ node: _node }: QuickActionsFooterProps) {
  const [testInput, setTestInput] = useState("")
  const [isRunning, setIsRunning] = useState(false)

  const handleQuickRun = async () => {
    if (!testInput.trim() || isRunning) return

    setIsRunning(true)
    // TODO: Implement quick run functionality
    // This would call the workflow API with just this node
    setTimeout(() => {
      setIsRunning(false)
      setTestInput("")
    }, 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleQuickRun()
    }
  }

  return (
    <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
      {/* Quick Test Input */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={testInput}
            onChange={e => setTestInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Test with a prompt... (⌘↵ to run)"
            className="flex-1 h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            disabled={isRunning}
          />
          <button
            type="button"
            onClick={handleQuickRun}
            disabled={!testInput.trim() || isRunning}
            className={cn(
              "h-9 px-4 rounded-md font-medium text-sm transition-all flex items-center gap-2",
              testInput.trim() && !isRunning
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed",
            )}
            title="Run this agent (⌘↵)"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunning ? "Running..." : "Test"}
          </button>
        </div>

        {/* Quick Actions Row */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors flex items-center gap-1.5"
            title="View execution history (⌘T)"
          >
            <History className="w-3.5 h-3.5" />
            View Traces
          </button>

          <div className="text-[11px] text-gray-400 dark:text-gray-500">Auto-saves • ESC to close</div>
        </div>
      </div>
    </div>
  )
}
