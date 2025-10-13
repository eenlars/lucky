"use client"

import { Check, ChevronDown, X } from "lucide-react"
import { useState } from "react"
import type { LogType } from "../types"

interface LogFiltersProps {
  selectedNodes: string[]
  selectedTypes: LogType[]
  availableNodes: string[]
  onNodesChange: (nodes: string[]) => void
  onTypesChange: (types: LogType[]) => void
  onClearAll: () => void
}

const LOG_TYPES: { value: LogType; label: string; color: string }[] = [
  { value: "INFO", label: "Info", color: "text-gray-500" },
  { value: "SUCCESS", label: "Success", color: "text-emerald-500" },
  { value: "WARNING", label: "Warning", color: "text-amber-500" },
  { value: "ERROR", label: "Error", color: "text-red-500" },
  { value: "DEBUG", label: "Debug", color: "text-blue-500" },
]

export function LogFilters({
  selectedNodes,
  selectedTypes,
  availableNodes,
  onNodesChange,
  onTypesChange,
  onClearAll,
}: LogFiltersProps) {
  const [nodeDropdownOpen, setNodeDropdownOpen] = useState(false)
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)

  const hasActiveFilters = selectedNodes.length > 0 || selectedTypes.length > 0

  const toggleNode = (node: string) => {
    if (selectedNodes.includes(node)) {
      onNodesChange(selectedNodes.filter(n => n !== node))
    } else {
      onNodesChange([...selectedNodes, node])
    }
  }

  const toggleType = (type: LogType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter(t => t !== type))
    } else {
      onTypesChange([...selectedTypes, type])
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Node Filter */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setNodeDropdownOpen(!nodeDropdownOpen)}
          className="h-8 px-3 text-sm border border-gray-200 dark:border-white/10 rounded hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
        >
          Node
          {selectedNodes.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-white/10 rounded text-xs font-medium">
              {selectedNodes.length}
            </span>
          )}
          <ChevronDown className="w-3 h-3" />
        </button>

        {nodeDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setNodeDropdownOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg z-50 p-2 max-h-64 overflow-y-auto">
              {availableNodes.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 p-2">No nodes yet</div>
              ) : (
                availableNodes.map(node => (
                  <label
                    key={node}
                    className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                  >
                    <div className="w-4 h-4 flex items-center justify-center border border-gray-300 dark:border-white/20 rounded">
                      {selectedNodes.includes(node) && <Check className="w-3 h-3 text-gray-900 dark:text-gray-100" />}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedNodes.includes(node)}
                      onChange={() => toggleNode(node)}
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{node}</span>
                  </label>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Type Filter */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
          className="h-8 px-3 text-sm border border-gray-200 dark:border-white/10 rounded hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
        >
          Type
          {selectedTypes.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-white/10 rounded text-xs font-medium">
              {selectedTypes.length}
            </span>
          )}
          <ChevronDown className="w-3 h-3" />
        </button>

        {typeDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setTypeDropdownOpen(false)} />
            <div className="absolute top-full left-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/10 rounded-lg shadow-lg z-50 p-2">
              {LOG_TYPES.map(({ value, label, color }) => (
                <label
                  key={value}
                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  <div className="w-4 h-4 flex items-center justify-center border border-gray-300 dark:border-white/20 rounded">
                    {selectedTypes.includes(value) && <Check className="w-3 h-3 text-gray-900 dark:text-gray-100" />}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedTypes.includes(value)}
                    onChange={() => toggleType(value)}
                  />
                  <span className={`text-sm ${color}`}>{label}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearAll}
          className="h-8 px-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  )
}
