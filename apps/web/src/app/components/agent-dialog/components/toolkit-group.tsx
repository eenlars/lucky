"use client"

import { cn } from "@/lib/utils"
import type { CodeToolName, MCPToolName } from "@lucky/tools"
import { ChevronDown } from "lucide-react"
import { useState } from "react"
import {
  areAllToolkitToolsSelected,
  countToolkitToolsSelected,
  getToolDescription,
  getToolkitDescription,
  getToolsInToolkit,
} from "../toolkit-utils"
import { ToolkitToolItem } from "./toolkit-tool-item"

interface MCPToolkitGroupProps {
  toolkitName: string
  currentTools: MCPToolName[]
  type: "mcp"
  onToggleToolkit: () => void
  onToggleTool: (toolName: MCPToolName) => void
}

interface CodeToolkitGroupProps {
  toolkitName: string
  currentTools: CodeToolName[]
  type: "code"
  onToggleToolkit: () => void
  onToggleTool: (toolName: CodeToolName) => void
}

type ToolkitGroupProps = MCPToolkitGroupProps | CodeToolkitGroupProps

export function ToolkitGroup({ toolkitName, currentTools, type, onToggleToolkit, onToggleTool }: ToolkitGroupProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const description = getToolkitDescription(toolkitName, type)
  const allTools = getToolsInToolkit(toolkitName, type)
  const selectedCount = countToolkitToolsSelected(currentTools, toolkitName, type)
  const isToolkitEnabled = areAllToolkitToolsSelected(currentTools, toolkitName, type)

  const handleToggleTool = (toolName: string) => {
    if (type === "mcp") {
      ;(onToggleTool as (toolName: MCPToolName) => void)(toolName as MCPToolName)
    } else {
      ;(onToggleTool as (toolName: CodeToolName) => void)(toolName as CodeToolName)
    }
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Toolkit header */}
      <div className="bg-white dark:bg-gray-900/50 p-3 flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
        {/* Left: Checkbox + Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Checkbox - checked if all tools in toolkit are selected */}
          <button
            type="button"
            onClick={onToggleToolkit}
            className={cn(
              "w-4 h-4 rounded-sm border transition-all flex-shrink-0 cursor-pointer",
              isToolkitEnabled
                ? "border-gray-400 dark:border-gray-500 bg-gray-900 dark:bg-gray-100"
                : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500",
            )}
          >
            {isToolkitEnabled && (
              <svg
                className="w-full h-full p-0.5 text-white dark:text-gray-900"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          {/* Toolkit info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{toolkitName}</p>
            {description && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{description}</p>}
          </div>
        </div>

        {/* Right: Tools count + Expand button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {selectedCount} of {allTools.length}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded ? "rotate-180" : "")} />
          </button>
        </div>
      </div>

      {/* Toolkit tools list (collapsible) */}
      {isExpanded && allTools.length > 0 && (
        <div
          className={cn("border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-3 space-y-2")}
        >
          {allTools.map(toolName => (
            <ToolkitToolItem
              key={toolName}
              toolName={toolName}
              description={getToolDescription(toolName, type)}
              isSelected={currentTools.some(t => t === toolName)}
              onToggle={() => handleToggleTool(toolName)}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {isExpanded && allTools.length === 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">No tools available in this toolkit</p>
        </div>
      )}
    </div>
  )
}
