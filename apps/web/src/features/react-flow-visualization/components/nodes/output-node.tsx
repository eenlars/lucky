"use client"

import { useReactFlow } from "@xyflow/react"
import { CheckCheck, X } from "lucide-react"
import { useCallback } from "react"
import nodesConfig, { COMPACT_NODE_SIZE, type WorkflowNodeProps } from "./nodes"
import { AppHandle } from "./workflow-node/app-handle"

export function OutputNode({ id, data: _data }: WorkflowNodeProps) {
  const { setNodes } = useReactFlow()

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setNodes(prevNodes => prevNodes.filter(node => node.id !== id))
    },
    [id, setNodes],
  )
  return (
    <div
      id={id}
      style={{
        width: COMPACT_NODE_SIZE.width,
        height: COMPACT_NODE_SIZE.height,
      }}
      className="relative select-none group"
      aria-label="End"
      role="img"
    >
      {/* Boxy end node */}
      <div className="pointer-events-none absolute inset-0">
        <div className="w-full h-full rounded-xl bg-purple-50 dark:bg-purple-950 shadow-lg border-2 border-purple-200 dark:border-purple-800 flex items-center justify-center transition-all duration-200">
          <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
            <CheckCheck className="size-5" />
          </div>
        </div>
      </div>

      {/* Delete button on hover */}
      <button
        type="button"
        onClick={handleDelete}
        className="absolute -top-2 -right-2 flex items-center justify-center h-6 w-6 rounded-full border border-purple-200 bg-white text-purple-600 shadow-sm hover:bg-purple-50 transition-colors opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
        aria-label="Delete end node"
      >
        <X className="size-4" />
      </button>

      {/* Connection handle(s) remain functional */}
      {nodesConfig["output-node"].handles.map(handle => (
        <AppHandle
          key={`${handle.type}-${handle.id}`}
          id={handle.id}
          type={handle.type}
          position={handle.position}
          x={handle.x}
          y={handle.y}
        />
      ))}
    </div>
  )
}
