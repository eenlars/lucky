"use client"

import { cn } from "@/lib/utils"

interface ToolCheckboxProps {
  tool: string
  isSelected: boolean
  onToggle: () => void
  description: string
  shortcut?: number
  variant: "blue" | "green"
}

/**
 * Reusable tool checkbox component
 * Eliminates 100+ lines of duplication
 */
export function ToolCheckbox({ tool, isSelected, onToggle, description, shortcut, variant }: ToolCheckboxProps) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      checkbox: "bg-blue-600 dark:bg-blue-500 border-blue-600 dark:border-blue-500",
    },
    green: {
      bg: "bg-green-50 dark:bg-green-900/20",
      checkbox: "bg-green-600 dark:bg-green-500 border-green-600 dark:border-green-500",
    },
  }[variant]

  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full text-left px-3 py-2 rounded-md transition-colors",
        isSelected ? colorClasses.bg : "hover:bg-gray-50 dark:hover:bg-gray-800",
      )}
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            "mt-0.5 h-4 w-4 flex items-center justify-center rounded border transition-colors",
            isSelected ? colorClasses.checkbox : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600",
          )}
        >
          {isSelected && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{tool}</span>
            {shortcut && shortcut <= 9 && (
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                ⌥{shortcut}
              </kbd>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 line-clamp-1">{description}</p>
        </div>
      </div>
    </button>
  )
}
