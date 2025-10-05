"use client"

import { cn } from "@/lib/utils"
import type { AppNode } from "@/react-flow-visualization/components/nodes/nodes"
import { useAppStore } from "@/react-flow-visualization/store/store"
import type { AnyModelName } from "@lucky/core/utils/spending/models.types"
import {
  ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION,
  type CodeToolName,
  type MCPToolName,
} from "@lucky/tools/client"
import { ChevronDown } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

interface ConfigPanelProps {
  node: AppNode
}

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-6 py-4 flex items-center justify-between transition-all",
          isOpen
            ? "bg-gray-50 dark:bg-gray-800/50"
            : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/30",
        )}
      >
        <h3
          className={cn(
            "text-sm font-semibold transition-colors",
            isOpen ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400",
          )}
        >
          {title}
        </h3>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-all duration-200",
            isOpen ? "rotate-180 text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500",
          )}
        />
      </button>
      <div
        className={cn("transition-all duration-200 ease-out overflow-hidden", isOpen ? "max-h-[1000px]" : "max-h-0")}
      >
        <div className={cn("px-6 py-4", "bg-white dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800")}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function ConfigPanel({ node }: ConfigPanelProps) {
  const updateNode = useAppStore(state => state.updateNode)

  const [systemPrompt, setSystemPrompt] = useState(node.data.systemPrompt || "")
  const mcpTools = node.data.mcpTools || []
  const codeTools = node.data.codeTools || []

  // Sync state when node changes
  useEffect(() => {
    setSystemPrompt(node.data.systemPrompt || "")
  }, [node.id, node.data.systemPrompt])

  // Auto-save system prompt after delay
  useEffect(() => {
    // Only set timer if the value actually changed from what's in node.data
    if (systemPrompt === node.data.systemPrompt) return

    const timer = setTimeout(() => {
      updateNode(node.id, { systemPrompt: systemPrompt })
    }, 500)

    return () => clearTimeout(timer)
  }, [systemPrompt]) // Only depend on systemPrompt, not node.data

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

  const totalTools = mcpTools.length + codeTools.length

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* System Prompt Section - Always visible */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">System Prompt</h3>
          <div className="relative">
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder="Enter instructions for this agent..."
              rows={8}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-300 dark:focus:border-gray-600 focus:bg-white dark:focus:bg-gray-800 transition-all resize-none font-mono leading-relaxed"
              style={{ minHeight: "160px" }}
            />
            <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-500">
              {systemPrompt.length} chars
            </div>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Define how this agent should behave and respond
          </p>
        </div>
      </div>

      {/* Tools Section - Collapsible */}
      <CollapsibleSection title={`Tools (${totalTools} selected)`} defaultOpen={true}>
        {/* MCP Tools */}
        {Object.entries(ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION).length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">MCP Tools</p>
              <span className="text-xs text-gray-500 dark:text-gray-400">{mcpTools.length} selected</span>
            </div>
            <div className="space-y-2">
              {Object.entries(ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION).map(([key, description]) => {
                const isSelected = mcpTools.includes(key as MCPToolName)
                return (
                  <button
                    key={key}
                    onClick={() => toggleTool(key, "mcp")}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      isSelected
                        ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-800/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{key}</p>
                        <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">{description}</p>
                      </div>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-sm border transition-all flex-shrink-0 ml-2",
                          isSelected
                            ? "border-gray-400 dark:border-gray-500 bg-gray-900 dark:bg-gray-100"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800",
                        )}
                      >
                        {isSelected && (
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
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Code Tools */}
        {Object.entries(ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Code Tools
              </p>
              <span className="text-xs text-gray-500 dark:text-gray-400">{codeTools.length} selected</span>
            </div>
            <div className="space-y-2">
              {Object.entries(ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION).map(([key, description]) => {
                const isSelected = codeTools.includes(key as CodeToolName)
                return (
                  <button
                    key={key}
                    onClick={() => toggleTool(key, "code")}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      isSelected
                        ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-800/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{key}</p>
                        <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">{description}</p>
                      </div>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-sm border transition-all flex-shrink-0 ml-2",
                          isSelected
                            ? "border-gray-400 dark:border-gray-500 bg-gray-900 dark:bg-gray-100"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800",
                        )}
                      >
                        {isSelected && (
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
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Advanced Configuration - Collapsed by default */}
      <CollapsibleSection title="Advanced Configuration" defaultOpen={false}>
        <div className="space-y-4">
          {/* Model Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
            <select
              value={node.data.modelName || ""}
              onChange={e => updateNode(node.id, { modelName: e.target.value as AnyModelName })}
              className="w-full px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="openai/gpt-4o">GPT-4o</option>
              <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
              <option value="anthropic/claude-3-opus">Claude 3 Opus</option>
              <option value="anthropic/claude-3-sonnet">Claude 3 Sonnet</option>
              <option value="anthropic/claude-3-haiku">Claude 3 Haiku</option>
            </select>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
}
