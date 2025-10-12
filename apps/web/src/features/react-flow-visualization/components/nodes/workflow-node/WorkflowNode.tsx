"use client"

import { useCallback, useState } from "react"

import { BaseNode } from "@/features/react-flow-visualization/components/base-node"
import { NodeHeaderDeleteAction } from "@/features/react-flow-visualization/components/node-header"
import { NodeStatusIndicator } from "@/features/react-flow-visualization/components/node-status-indicator"
import { NODE_SIZE, type WorkflowNodeData } from "@/features/react-flow-visualization/components/nodes/nodes"
import { iconMapping } from "@/features/react-flow-visualization/components/ui/icon-mapping"
// runner context removed
import { useAppStore } from "@/features/react-flow-visualization/store/store"
// Unused tool imports removed
// Provider hardcoded for client-side display

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
  const _setPromptDialogOpen = (_: boolean) => {}
  const openNodeDetails = useAppStore(state => state.openNodeDetails)
  const _updateNode = useAppStore(state => state.updateNode)
  const [_isToolSelectorOpen, _setIsToolSelectorOpen] = useState(false)

  const _onRunClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    // When clicking run from a node in graph mode, just open the prompt dialog.
    // Optionally, we could pre-fill a startNodeId here.
    // runner removed
  }, [])

  // check if this is a start or end node by type
  const isStartOrEndNode = data?.nodeType === "initial-node" || data?.nodeType === "output-node"

  const onNodeClick = useCallback(() => {
    if (!isStartOrEndNode) {
      openNodeDetails(id)
    }
  }, [id, openNodeDetails, isStartOrEndNode])

  // Node ID is edited in the Node Details dialog; inline editing removed

  const _handleToolSelect = useCallback((_toolName: string) => {
    // Functionality removed
  }, [])

  const _onAddToolClick = useCallback((_e: React.MouseEvent) => {
    // Functionality removed
  }, [])

  const _IconComponent = data?.icon ? iconMapping[data.icon] : undefined

  // show raw model id plus provider (e.g., openai/gpt-4.1-mini + openrouter)
  const displayModelName = (() => {
    const full = data?.modelName || ""
    if (!full) return null
    return `${full} + openrouter`
  })()

  const _totalTools = (data?.mcpTools?.length || 0) + (data?.codeTools?.length || 0)
  const _connectionCount = data?.handOffs?.length || 0

  const allTools = [...(data?.mcpTools || []), ...(data?.codeTools || [])]
  const _visibleTools = allTools.slice(0, 3)
  const hiddenTools = allTools.slice(3)

  return (
    <NodeStatusIndicator status={data?.status}>
      <BaseNode
        className={`bg-white border-2 border-gray-200 rounded-xl transition-all duration-200 p-0 group focus:outline-none ${
          isStartOrEndNode
            ? "cursor-default opacity-75"
            : "cursor-pointer hover:border-gray-300 hover:shadow-lg focus:ring-2 focus:ring-blue-400/50"
        }`}
        style={{ ...NODE_SIZE }}
        onClick={onNodeClick}
        onDoubleClick={onNodeClick}
        aria-label={`Node ${data?.nodeId}`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <h3
              className={`text-sm font-semibold text-gray-900 truncate ${
                isStartOrEndNode ? "" : "group-hover:text-blue-600 transition-colors"
              }`}
              onDoubleClick={onNodeClick}
            >
              {data?.nodeId}
            </h3>
            {!isStartOrEndNode && displayModelName && (
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <span className="w-1 h-1 rounded-full bg-green-500" />
                <span className="truncate">{displayModelName}</span>
              </div>
            )}
          </div>

          {!isStartOrEndNode && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <NodeHeaderDeleteAction />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Description */}
          <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
            {data?.description || data?.label || "No description"}
          </p>

          {/* Tools Grid */}
          {(data?.mcpTools?.length > 0 || data?.codeTools?.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {data?.mcpTools?.slice(0, 3).map((tool, index) => (
                <span
                  key={`mcp-${index}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-medium rounded-md truncate max-w-[120px]"
                  title={tool}
                >
                  <span className="w-1 h-1 rounded-full bg-blue-500" />
                  {tool}
                </span>
              ))}
              {data?.codeTools?.slice(0, 3 - (data?.mcpTools?.length || 0)).map((tool, index) => (
                <span
                  key={`code-${index}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-medium rounded-md truncate max-w-[120px]"
                  title={tool}
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  {tool}
                </span>
              ))}

              {hiddenTools.length > 0 && (
                <div className="relative group/popover">
                  <button
                    type="button"
                    className="inline-flex items-center px-2 py-0.5 border border-gray-200 bg-gray-50 text-gray-600 text-[10px] font-medium rounded-md hover:bg-gray-100 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    +{hiddenTools.length}
                  </button>
                  <div className="hidden group-hover/popover:block absolute left-0 bottom-full mb-2 w-48 bg-white border-2 border-gray-200 rounded-xl shadow-xl z-10 overflow-hidden">
                    <div className="p-2 bg-gray-50 border-b border-gray-200">
                      <p className="text-[10px] font-semibold text-gray-700">Additional Tools</p>
                    </div>
                    <ul className="p-2 space-y-1 max-h-40 overflow-y-auto">
                      {hiddenTools.map((tool, index) => (
                        <li key={index} className="text-[11px] text-gray-700 px-2 py-1 rounded-md hover:bg-gray-50">
                          {tool}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ReactFlow connection handles */}
        {children}
      </BaseNode>
    </NodeStatusIndicator>
  )
}

export default WorkflowNode
