"use client"

import { useReactFlow } from "@xyflow/react"
import { CheckCheck, Trash } from "lucide-react"
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
        className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto hover:bg-purple-100 dark:hover:bg-purple-900 rounded"
        aria-label="Delete node"
      >
        <Trash className="w-4 h-4 text-purple-600 dark:text-purple-400" />
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
