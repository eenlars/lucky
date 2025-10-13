"use client"

import { useReactFlow } from "@xyflow/react"
import { Plug, Trash } from "lucide-react"
import { useCallback } from "react"
import nodesConfig, { COMPACT_NODE_SIZE, type WorkflowNodeProps } from "./nodes"
import { AppHandle } from "./workflow-node/app-handle"

export function ConnectorNode({ id, data: _data }: WorkflowNodeProps) {
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
      aria-label="Connector"
      role="img"
    >
      {/* Connector node */}
      <div className="pointer-events-none absolute inset-0">
        <div className="w-full h-full rounded-xl bg-emerald-50 dark:bg-emerald-950 shadow-lg border-2 border-emerald-200 dark:border-emerald-800 flex items-center justify-center transition-all duration-200">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            <Plug className="size-5" />
          </div>
        </div>
      </div>

      {/* Delete button on hover */}
      <button
        type="button"
        onClick={handleDelete}
        className="absolute top-1 right-1 p-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded"
        aria-label="Delete node"
      >
        <Trash className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      </button>

      {/* Connection handle(s) remain functional */}
      {nodesConfig["connector-node"].handles.map(handle => (
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
