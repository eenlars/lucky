"use client"

import type { AppNode } from "@/features/react-flow-visualization/components/nodes/nodes"
import { useAppStore } from "@/features/react-flow-visualization/store/store"
import { useFeatureFlag } from "@/lib/feature-flags"
import { cn } from "@/lib/utils"
import type { CodeToolName, MCPToolName } from "@lucky/tools"
import { Lock, Wrench } from "lucide-react"
import { useCallback, useState } from "react"
import { CollapsibleSection } from "./collapsible-section"
import { ToolkitGroup } from "./components/toolkit-group"
import {
  getAllCodeTools,
  getAllMCPTools,
  getAllToolkitNames,
  toggleCodeTool,
  toggleCodeToolkit,
  toggleMCPTool,
  toggleMCPToolkit,
} from "./toolkit-utils"

interface ToolsSectionProps {
  node: AppNode
}

export function ToolsSection({ node }: ToolsSectionProps) {
  const toolsEnabled = useFeatureFlag("MCP_TOOLS")
  const updateNode = useAppStore(state => state.updateNode)
  const [isToolsExpanded, setIsToolsExpanded] = useState(false)

  const mcpTools = node.data.mcpTools || []
  const codeTools = node.data.codeTools || []
  const allTools = [...mcpTools, ...codeTools]
  const toolCount = allTools.length

  const handleToggleMCPToolkit = useCallback(
    (toolkitName: string) => {
      if (!toolsEnabled) return
      const updatedTools = toggleMCPToolkit(mcpTools, toolkitName)
      updateNode(node.id, { mcpTools: updatedTools })
    },
    [toolsEnabled, mcpTools, node.id, updateNode],
  )

  const handleToggleMCPTool = useCallback(
    (toolName: MCPToolName) => {
      if (!toolsEnabled) return
      const updatedTools = toggleMCPTool(mcpTools, toolName)
      updateNode(node.id, { mcpTools: updatedTools })
    },
    [toolsEnabled, mcpTools, node.id, updateNode],
  )

  const handleToggleCodeToolkit = useCallback(
    (toolkitName: string) => {
      if (!toolsEnabled) return
      const updatedTools = toggleCodeToolkit(codeTools, toolkitName)
      updateNode(node.id, { codeTools: updatedTools })
    },
    [toolsEnabled, codeTools, node.id, updateNode],
  )

  const handleToggleCodeTool = useCallback(
    (toolName: CodeToolName) => {
      if (!toolsEnabled) return
      const updatedTools = toggleCodeTool(codeTools, toolName)
      updateNode(node.id, { codeTools: updatedTools })
    },
    [toolsEnabled, codeTools, node.id, updateNode],
  )

  const handleEnableAll = useCallback(() => {
    if (!toolsEnabled) return
    const allMcp = getAllMCPTools(true)
    const allCode = getAllCodeTools(true)
    updateNode(node.id, { mcpTools: allMcp, codeTools: allCode })
  }, [toolsEnabled, node.id, updateNode])

  const handleDisableAll = useCallback(() => {
    if (!toolsEnabled) return
    updateNode(node.id, { mcpTools: [], codeTools: [] })
  }, [toolsEnabled, node.id, updateNode])

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
              type="button"
              onClick={() => setIsToolsExpanded(true)}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              +{allTools.length - 3} more
            </button>
          )}
          {allTools.length === 0 && (
            <button
              type="button"
              onClick={() => setIsToolsExpanded(true)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Add tools...
            </button>
          )}
          {allTools.length > 0 && allTools.length <= 3 && (
            <button
              type="button"
              onClick={() => setIsToolsExpanded(true)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      )}

      {/* Expanded toolkit selector */}
      {isToolsExpanded && (
        <div className="space-y-4">
          {!toolsEnabled && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Lock className="size-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">Tools disabled</p>
                  <p className="text-xs text-muted-foreground">Tools are disabled until the feature is enabled.</p>
                </div>
              </div>
            </div>
          )}

          {toolsEnabled && (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleEnableAll}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  Enable All
                </button>
                <button
                  type="button"
                  onClick={handleDisableAll}
                  className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  Disable All
                </button>
                <button
                  type="button"
                  onClick={() => setIsToolsExpanded(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  Done
                </button>
              </div>

              {getAllToolkitNames("mcp").length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    MCP Servers
                  </h4>
                  <div className="space-y-2">
                    {getAllToolkitNames("mcp").map(toolkitName => (
                      <ToolkitGroup
                        key={toolkitName}
                        toolkitName={toolkitName}
                        currentTools={mcpTools}
                        type="mcp"
                        onToggleToolkit={() => handleToggleMCPToolkit(toolkitName)}
                        onToggleTool={handleToggleMCPTool}
                      />
                    ))}
                  </div>
                </div>
              )}

              {getAllToolkitNames("code").length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Code Tools
                  </h4>
                  <div className="space-y-2">
                    {getAllToolkitNames("code").map(toolkitName => (
                      <ToolkitGroup
                        key={toolkitName}
                        toolkitName={toolkitName}
                        currentTools={codeTools}
                        type="code"
                        onToggleToolkit={() => handleToggleCodeToolkit(toolkitName)}
                        onToggleTool={handleToggleCodeTool}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </CollapsibleSection>
  )
}
