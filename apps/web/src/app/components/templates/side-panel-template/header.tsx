"use client"

import { cn } from "@/lib/utils"
import { Maximize2, Minimize2, X } from "lucide-react"

export interface SidePanelHeaderProps {
  title: string
  icon?: React.ReactNode
  statusIndicator?: React.ReactNode
  isExpanded?: boolean
  onClose: () => void
  onToggleExpanded?: () => void
}

export function SidePanelHeader({
  title,
  icon,
  statusIndicator,
  isExpanded = false,
  onClose,
  onToggleExpanded,
}: SidePanelHeaderProps) {
  return (
    <div className="h-[70px] flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* icon */}
        {icon && <div className="flex-shrink-0">{icon}</div>}

        {/* title */}
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h2>

        {/* status indicator */}
        {statusIndicator && <div className="flex-shrink-0">{statusIndicator}</div>}
      </div>

      {/* actions */}
      <div className="flex items-center gap-1 flex-shrink-0 ml-4">
        {/* expand/collapse */}
        {onToggleExpanded && (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
            aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
            title={isExpanded ? "Collapse (smaller view)" : "Expand (wider view)"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}

        {/* close */}
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
          aria-label="Close panel"
          title="Close (ESC)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
