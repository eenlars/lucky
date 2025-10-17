"use client"

import { cn } from "@/lib/utils"

interface ToolkitToolItemProps {
  toolName: string
  description?: string
  isSelected: boolean
  onToggle: () => void
}

export function ToolkitToolItem({ toolName, description, isSelected, onToggle }: ToolkitToolItemProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full text-left p-2 rounded border transition-all flex items-center justify-between gap-2",
        isSelected
          ? "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800"
          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/20 hover:bg-gray-50 dark:hover:bg-gray-800/30",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{toolName}</p>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>}
      </div>

      {/* Checkbox */}
      <div
        className={cn(
          "w-4 h-4 rounded-sm border transition-all flex-shrink-0",
          isSelected
            ? "border-gray-400 dark:border-gray-500 bg-gray-900 dark:bg-gray-100"
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800",
        )}
      >
        {isSelected && (
          <svg className="w-full h-full p-0.5 text-white dark:text-gray-900" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    </button>
  )
}
