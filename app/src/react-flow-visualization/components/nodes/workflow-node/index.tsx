"use client"

import { Edit, Play } from "lucide-react"
import { useCallback, useState } from "react"

import { BaseNode } from "@/react-flow-visualization/components/base-node"
import { NodeHeaderDeleteAction } from "@/react-flow-visualization/components/node-header"
import { NodeStatusIndicator } from "@/react-flow-visualization/components/node-status-indicator"
import {
  NODE_SIZE,
  WorkflowNodeData,
} from "@/react-flow-visualization/components/nodes/"
import { iconMapping } from "@/react-flow-visualization/components/ui/icon-mapping"
import { Input } from "@/react-flow-visualization/components/ui/input"
import { useWorkflowRunnerContext } from "@/react-flow-visualization/hooks/workflow-runner-context"
import { useAppStore } from "@/react-flow-visualization/store"
import {
  ACTIVE_MCP_TOOL_NAMES,
  type CodeToolName,
  type MCPToolName,
} from "@core/tools/tool.types"

// this is an example of how to implement the WorkflowNode component. All the nodes in the Workflow Builder example
// are variations on this CustomNode defined in the index.tsx file.
// you can also create new components for each of your nodes for greater flexibility.
function WorkflowNode({
  id,
  data,
  children,
}: {
  id: string
  data: WorkflowNodeData
  children?: React.ReactNode
}) {
  const { runWorkflow, setPromptDialogOpen } = useWorkflowRunnerContext()
  const openNodeDetails = useAppStore((state) => state.openNodeDetails)
  const updateNode = useAppStore((state) => state.updateNode)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState(data?.title || "")
  const [isToolSelectorOpen, setIsToolSelectorOpen] = useState(false)

  const onRunClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      // When clicking run from a node in graph mode, just open the prompt dialog.
      // Optionally, we could pre-fill a startNodeId here.
      setPromptDialogOpen(true)
    },
    [setPromptDialogOpen]
  )

  // check if this is a start or end node
  const isStartOrEndNode =
    data?.title === "Initial Node" || data?.title === "Output Node"

  const onNodeClick = useCallback(() => {
    if (!isStartOrEndNode) {
      openNodeDetails(id)
    }
  }, [id, openNodeDetails, isStartOrEndNode])

  const handleTitleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!isStartOrEndNode) {
        setIsEditingTitle(true)
        setTempTitle(data?.title || "")
      }
    },
    [data?.title, isStartOrEndNode]
  )

  const handleTitleSave = useCallback(() => {
    if (tempTitle.trim() !== data?.title) {
      updateNode(data.nodeId, { title: tempTitle.trim() })
    }
    setIsEditingTitle(false)
  }, [tempTitle, data?.title, data.nodeId, updateNode])

  const handleTitleCancel = useCallback(() => {
    setTempTitle(data?.title || "")
    setIsEditingTitle(false)
  }, [data?.title])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleTitleSave()
      } else if (e.key === "Escape") {
        handleTitleCancel()
      }
    },
    [handleTitleSave, handleTitleCancel]
  )

  const handleToolSelect = useCallback(
    (toolName: string) => {
      const currentMcpTools = data?.mcpTools || []
      const currentCodeTools = data?.codeTools || []

      // check if tool is already added
      if (
        currentMcpTools.includes(toolName as MCPToolName) ||
        currentCodeTools.includes(toolName as CodeToolName)
      ) {
        return
      }

      // determine if it's an MCP tool or code tool and add to appropriate array
      const isMcpTool = ACTIVE_MCP_TOOL_NAMES.includes(toolName as MCPToolName)
      if (isMcpTool) {
        updateNode(data.nodeId, {
          mcpTools: [...currentMcpTools, toolName as MCPToolName],
        })
      } else {
        updateNode(data.nodeId, {
          codeTools: [...currentCodeTools, toolName as CodeToolName],
        })
      }

      setIsToolSelectorOpen(false)
    },
    [data?.mcpTools, data?.codeTools, data.nodeId, updateNode]
  )

  const onAddToolClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsToolSelectorOpen(true)
  }, [])

  const IconComponent = data?.icon ? iconMapping[data.icon] : undefined

  // derive a clean, human-readable model name (Stripe-like chip)
  const displayModelName = (() => {
    const full = data?.modelName || ""
    if (!full) return null
    const raw = full.includes("/") ? full.split("/")[1] : full
    return raw
      .split("-")
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(" ")
  })()

  const totalTools =
    (data?.mcpTools?.length || 0) + (data?.codeTools?.length || 0)
  const connectionCount = data?.handOffs?.length || 0

  const allTools = [...(data?.mcpTools || []), ...(data?.codeTools || [])]
  const visibleTools = allTools.slice(0, 3)
  const hiddenTools = allTools.slice(3)

  return (
    <NodeStatusIndicator status={data?.status}>
      <BaseNode
        className={`bg-white border border-gray-200 rounded-lg shadow-sm transition-shadow p-4 group focus:outline-none ${
          isStartOrEndNode
            ? "cursor-default opacity-75"
            : "cursor-pointer hover:shadow-md focus:ring-2 focus:ring-blue-300"
        }`}
        style={{ ...NODE_SIZE }}
        onClick={onNodeClick}
        onDoubleClick={onNodeClick}
        tabIndex={isStartOrEndNode ? -1 : 0}
        role="button"
        aria-label={`Node ${data?.nodeId}`}
      >
        {/* Title + Controls */}
        <div className="flex justify-between items-start mb-2">
          {isEditingTitle ? (
            <Input
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="text-lg font-medium p-1 border-0 shadow-none bg-transparent focus-visible:ring-1"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div className="flex flex-col gap-1">
              <h3
                className={`text-lg font-medium text-gray-900 rounded px-1 -mx-1 transition-colors group/title ${
                  isStartOrEndNode ? "" : "cursor-pointer hover:bg-gray-50"
                }`}
                onDoubleClick={handleTitleDoubleClick}
              >
                {data?.nodeId}
                {!isStartOrEndNode && (
                  <Edit className="w-3 h-3 ml-2 opacity-0 group-hover/title:opacity-50 inline transition-opacity" />
                )}
              </h3>
              {!isStartOrEndNode && displayModelName && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  {displayModelName}
                </span>
              )}
            </div>
          )}

          <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onRunClick}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              aria-label="Run node"
            >
              <Play className="w-5 h-5 text-gray-600" />
            </button>
            <NodeHeaderDeleteAction />
          </div>
        </div>

        {/* Pills Row */}
        <div className="flex items-center gap-2 mb-3">
          {/* Visible tools */}
          {data?.mcpTools?.slice(0, 3).map((tool, index) => (
            <span
              key={`mcp-${index}`}
              className="inline-block bg-blue-50 text-blue-600 text-xs font-medium px-2 py-0.5 rounded-full truncate"
            >
              {tool}
            </span>
          ))}
          {data?.codeTools
            ?.slice(0, 3 - (data?.mcpTools?.length || 0))
            .map((tool, index) => (
              <span
                key={`code-${index}`}
                className="inline-block bg-green-50 text-green-600 text-xs font-medium px-2 py-0.5 rounded-full truncate"
              >
                {tool}
              </span>
            ))}

          {/* Overflow pill with popover */}
          {hiddenTools.length > 0 && (
            <div className="relative group/popover">
              <button
                className="inline-block border border-gray-300 text-gray-500 text-xs px-2 py-0.5 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                +{hiddenTools.length} more
              </button>
              <div className="hidden group-hover/popover:block absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <ul className="p-2 space-y-1">
                  {hiddenTools.map((tool, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-700 px-2 py-1 rounded hover:bg-gray-50"
                    >
                      {tool}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2 mb-2">
          {data?.description || data?.label || "No description provided"}
        </p>

        {/* ReactFlow connection handles */}
        {children}
      </BaseNode>
    </NodeStatusIndicator>
  )
}

export default WorkflowNode
