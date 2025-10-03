"use client"

import type { AppNode } from "@/react-flow-visualization/components/nodes"
import { useAppStore } from "@/react-flow-visualization/store"
import {
  ACTIVE_MCP_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION,
  type MCPToolName,
  type CodeToolName,
} from "@lucky/tools/client"
import { useCallback, useState, useEffect } from "react"
import { CollapsibleSection } from "./collapsible-section"
import { ToolCheckbox } from "./components/tool-checkbox"
import { Wrench } from "lucide-react"
import { cn } from "@/lib/utils"

interface ToolsSectionProps {
  node: AppNode
}

export function ToolsSection({ node }: ToolsSectionProps) {
  const updateNode = useAppStore(state => state.updateNode)
  const [isToolsExpanded, setIsToolsExpanded] = useState(false)

  const mcpTools = node.data.mcpTools || []
  const codeTools = node.data.codeTools || []
  const allTools = [...mcpTools, ...codeTools]
  const toolCount = allTools.length

  // FIX: Single toggle function instead of duplication
  const toggleTool = useCallback(
    (toolName: string, type: "mcp" | "code") => {
      if (type === "mcp") {
        const current = node.data.mcpTools || []
        const newTools = current.includes(toolName as MCPToolName)
          ? current.filter(t => t !== toolName)
          : [...current, toolName as MCPToolName]
        updateNode(node.id, { mcpTools: newTools })
      } else {
        const current = node.data.codeTools || []
        const newTools = current.includes(toolName as CodeToolName)
          ? current.filter(t => t !== toolName)
          : [...current, toolName as CodeToolName]
        updateNode(node.id, { codeTools: newTools })
      }
    },
    [node.data.mcpTools, node.data.codeTools, node.id, updateNode],
  )

  // FIX: Only add listener when panel is open AND tools expanded
  useEffect(() => {
    if (!isToolsExpanded) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.altKey) return
      const num = parseInt(e.key)
      if (num >= 1 && num <= 9) {
        e.preventDefault()
        const allToolNames = [...ACTIVE_MCP_TOOL_NAMES, ...ACTIVE_CODE_TOOL_NAMES]
        const toolIndex = num - 1
        if (toolIndex < allToolNames.length) {
          const tool = allToolNames[toolIndex]
          const type = ACTIVE_MCP_TOOL_NAMES.includes(tool as MCPToolName) ? "mcp" : "code"
          toggleTool(tool, type)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isToolsExpanded, toggleTool])

  return (
    <CollapsibleSection
      title="Tools"
      icon={<Wrench className="w-4 h-4" />}
      badge={toolCount || undefined}
      defaultOpen={false}
    >
      {/* Pills view - collapsed state */}
      {!isToolsExpanded && (
        <div className="flex flex-wrap items-center gap-1.5">
          {/* FIX: Use tool as key instead of idx */}
          {allTools.slice(0, 3).map(tool => (
            <span
              key={tool}
              className={cn(
                "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                mcpTools.includes(tool as MCPToolName)
                  ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
              )}
            >
              {tool}
            </span>
          ))}
          {allTools.length > 3 && (
            <button
              onClick={() => setIsToolsExpanded(true)}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              +{allTools.length - 3} more
            </button>
          )}
          {allTools.length === 0 && (
            <button
              onClick={() => setIsToolsExpanded(true)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Add tools...
            </button>
          )}
          {allTools.length > 0 && allTools.length <= 3 && (
            <button
              onClick={() => setIsToolsExpanded(true)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      )}

      {/* Expanded tool selector */}
      {isToolsExpanded && (
        <div className="space-y-4">
          {/* MCP Tools */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">Web & API</h4>
              <button
                onClick={() => setIsToolsExpanded(false)}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Collapse
              </button>
            </div>
            <div className="space-y-0.5">
              {ACTIVE_MCP_TOOL_NAMES.map((tool, idx) => (
                <ToolCheckbox
                  key={tool}
                  tool={tool}
                  isSelected={mcpTools.includes(tool)}
                  onToggle={() => toggleTool(tool, "mcp")}
                  description={ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION[tool] || ""}
                  shortcut={idx + 1}
                  variant="blue"
                />
              ))}
            </div>
          </div>

          {/* Code Tools */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400">Code & Files</h4>
            <div className="space-y-0.5">
              {ACTIVE_CODE_TOOL_NAMES.map((tool, idx) => (
                <ToolCheckbox
                  key={tool}
                  tool={tool}
                  isSelected={codeTools.includes(tool)}
                  onToggle={() => toggleTool(tool, "code")}
                  description={ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION[tool] || ""}
                  shortcut={ACTIVE_MCP_TOOL_NAMES.length + idx + 1}
                  variant="green"
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </CollapsibleSection>
  )
}
