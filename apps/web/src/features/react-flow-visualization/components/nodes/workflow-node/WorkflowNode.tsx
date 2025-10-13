"use client"

import { cn } from "@/lib/utils"
import { Brain, Plug, User } from "lucide-react"
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
  const updateNode = useAppStore(state => state.updateNode)
  const draggedPaletteNodeType = useAppStore(state => state.draggedPaletteNodeType)
  const [_isToolSelectorOpen, _setIsToolSelectorOpen] = useState(false)
  const [isDropZoneActive, setIsDropZoneActive] = useState(false)

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

  // show raw model id (e.g., openai/gpt-4o-mini)
  const displayModelName = (() => {
    const full = data?.modelName || ""
    if (!full) return null
    return full
  })()

  const _totalTools = (data?.mcpTools?.length || 0) + (data?.codeTools?.length || 0)
  const _connectionCount = data?.handOffs?.length || 0

  const allTools = [...(data?.mcpTools || []), ...(data?.codeTools || [])]
  const _visibleTools = allTools.slice(0, 3)
  const hiddenTools = allTools.slice(3)

  // Status-based border color
  const borderColor = (() => {
    if (isStartOrEndNode) return "border-gray-200 dark:border-gray-800"
    switch (data?.status) {
      case "loading":
        return "border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/20"
      case "success":
        return "border-green-500 dark:border-green-400"
      case "error":
        return "border-red-500 dark:border-red-400"
      default:
        return "border-blue-200 dark:border-blue-800"
    }
  })()

  // Drop zone handlers for human gate and connectors
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const nodeType = e.dataTransfer.getData("application/reactflow")
    if (nodeType) {
      try {
        const parsed = JSON.parse(nodeType)
        if (parsed.id === "human-node" || parsed.id === "connector-node") {
          setIsDropZoneActive(true)
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDropZoneActive(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDropZoneActive(false)

      const nodeType = e.dataTransfer.getData("application/reactflow")
      if (nodeType) {
        try {
          const parsed = JSON.parse(nodeType)
          if (parsed.id === "human-node") {
            // Enable approval gate on this agent
            updateNode(id, { requiresApproval: true })
          } else if (parsed.id === "connector-node") {
            // Add connector to this agent
            const existingConnectors = data?.connectors || []
            updateNode(id, { connectors: [...existingConnectors, `connector-${Date.now()}`] })
          }
        } catch {
          // Invalid JSON, ignore
        }
      }
    },
    [id, updateNode, data?.connectors],
  )

  return (
    <NodeStatusIndicator status={data?.status}>
      {/* Wrapper with overflow visible to show badges above */}
      <div className="relative" style={{ overflow: "visible" }}>
        {/* Connector badges - positioned ABOVE the node, left side */}
        {!isStartOrEndNode && data?.connectors && data.connectors.length > 0 && (
          <div className="absolute left-4 -top-16 z-50 flex gap-2">
            {data.connectors.map((connector, index) => (
              <button
                key={connector}
                type="button"
                className="flex items-center justify-center w-14 h-14 rounded-lg border-2 border-emerald-500 dark:border-emerald-400 bg-emerald-50 dark:bg-emerald-950 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                title={`Connector ${index + 1}`}
                onClick={e => {
                  e.stopPropagation()
                  openNodeDetails(id)
                }}
              >
                <Plug className="size-8 text-emerald-600 dark:text-emerald-400" />
              </button>
            ))}
          </div>
        )}

        {/* Human-in-the-loop gate badge - positioned ABOVE the node, right side */}
        {!isStartOrEndNode && data?.requiresApproval && (
          <button
            type="button"
            className="absolute right-4 -top-16 z-50 flex items-center justify-center w-14 h-14 rounded-lg border-2 border-amber-500 dark:border-amber-400 bg-amber-50 dark:bg-amber-950 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
            title="Human gate"
            onClick={e => {
              e.stopPropagation()
              openNodeDetails(id)
            }}
          >
            <User className="size-8 text-amber-600 dark:text-amber-400" />
          </button>
        )}

        <BaseNode
          className={cn(
            "bg-white dark:bg-gray-900 border-2 rounded-xl transition-all duration-200 p-0 group focus:outline-none",
            borderColor,
            isStartOrEndNode
              ? "cursor-default opacity-75"
              : "cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg focus:ring-2 focus:ring-blue-400/50",
          )}
          style={{ ...NODE_SIZE }}
          onClick={onNodeClick}
          onDoubleClick={onNodeClick}
          aria-label={`Node ${data?.nodeId}`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Brain Icon - matches palette */}
              {!isStartOrEndNode && (
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 flex-shrink-0">
                  <Brain className="size-4 text-blue-600 dark:text-blue-400" />
                </div>
              )}
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <h3
                  className={cn(
                    "text-xs font-medium text-gray-600 dark:text-gray-400 truncate",
                    !isStartOrEndNode && "group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors",
                  )}
                  onDoubleClick={onNodeClick}
                >
                  {data?.nodeId}
                </h3>
                {!isStartOrEndNode && displayModelName && (
                  <div className="flex items-center gap-1 text-[9px] text-gray-400 dark:text-gray-500">
                    <span className="w-1 h-1 rounded-full bg-green-500" />
                    <span className="truncate">{displayModelName}</span>
                  </div>
                )}
              </div>
            </div>

            {!isStartOrEndNode && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <NodeHeaderDeleteAction />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-4 py-3 space-y-2.5">
            {/* Description - Primary task (what this agent does) */}
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed line-clamp-2">
              {data?.systemPrompt || data?.description || data?.label || "No task defined"}
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

          {/* Drop zones - show only when relevant node is being dragged */}
          {!isStartOrEndNode && draggedPaletteNodeType === "human-node" && (
            <div
              className={cn(
                "absolute right-4 -top-16 w-16 h-16 transition-all duration-200 rounded-lg pointer-events-auto",
                isDropZoneActive &&
                  "bg-amber-100/50 dark:bg-amber-900/30 border-2 border-dashed border-amber-500 dark:border-amber-400",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          )}

          {!isStartOrEndNode && draggedPaletteNodeType === "connector-node" && (
            <div
              className={cn(
                "absolute left-4 -top-16 w-16 h-16 transition-all duration-200 rounded-lg pointer-events-auto",
                isDropZoneActive &&
                  "bg-emerald-100/50 dark:bg-emerald-900/30 border-2 border-dashed border-emerald-500 dark:border-emerald-400",
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            />
          )}

          {/* ReactFlow connection handles */}
          {children}
        </BaseNode>
      </div>
    </NodeStatusIndicator>
  )
}

export default WorkflowNode
