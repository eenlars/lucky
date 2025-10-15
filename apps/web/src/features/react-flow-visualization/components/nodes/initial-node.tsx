"use client"

import { useReactFlow } from "@xyflow/react"
import { Rocket, X } from "lucide-react"
import { useCallback, useState } from "react"
import nodesConfig, { COMPACT_NODE_SIZE, type WorkflowNodeProps } from "./nodes"
import { AppHandle } from "./workflow-node/app-handle"

export function InitialNode({ id, data: _data }: WorkflowNodeProps) {
  const { setNodes } = useReactFlow()
  const [isExpanded, setIsExpanded] = useState(false)

  const handleClick = () => {
    if (!isExpanded) {
      setIsExpanded(true)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      setIsExpanded(false)
    }
    if (e.key === "Escape") {
      setIsExpanded(false)
    }
  }

  const expandedWidth = 400
  const expandedHeight = 100
  const widthDiff = expandedWidth - COMPACT_NODE_SIZE.width

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setNodes(prevNodes => prevNodes.filter(node => node.id !== id))
    },
    [id, setNodes],
  )

  return (
    <>
      {/* Backdrop to close on outside click */}
      {isExpanded && (
        <div className="fixed inset-0 z-40" onClick={() => setIsExpanded(false)} style={{ cursor: "default" }} />
      )}

      <div
        id={id}
        style={{
          width: isExpanded ? expandedWidth : COMPACT_NODE_SIZE.width,
          height: isExpanded ? expandedHeight : COMPACT_NODE_SIZE.height,
          transform: isExpanded ? `translateX(-${widthDiff}px)` : "translateX(0)",
          transition:
            "width 300ms cubic-bezier(0.4, 0, 0.2, 1), height 300ms cubic-bezier(0.4, 0, 0.2, 1), transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: isExpanded ? 50 : "auto",
        }}
        className="relative select-none group"
        aria-label="Start"
        role="img"
      >
        {/* Start node content */}
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={handleClick}
          style={{ pointerEvents: isExpanded ? "none" : "auto" }}
        >
          <div
            className={`
            w-full h-full rounded-xl shadow-lg border-2
            flex items-center justify-center
            transition-all duration-300
            ${
              isExpanded
                ? "bg-white border-green-500"
                : "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"
            }
          `}
          >
            {!isExpanded && (
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400">
                <Rocket className="size-5" />
              </div>
            )}
          </div>
        </div>

        {/* Textarea when expanded */}
        {isExpanded && (
          <div className="absolute inset-0 p-4 pointer-events-auto animate-in fade-in duration-200 delay-100">
            <textarea
              onKeyDown={handleKeyDown}
              onClick={e => e.stopPropagation()}
              className="w-full h-full bg-transparent border-none outline-none resize-none text-sm text-gray-900 placeholder-gray-400"
              placeholder="Describe what you want to accomplish..."
            />
            <button
              type="button"
              onClick={e => {
                e.stopPropagation()
                setIsExpanded(false)
              }}
              className="absolute top-2 right-2 p-1 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Minimize"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-gray-500"
              >
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
        )}

        {/* Delete button on hover - hide when expanded */}
        {!isExpanded && (
          <button
            type="button"
            aria-label="Delete start node"
            className="absolute -top-2 -right-2 flex items-center justify-center h-6 w-6 rounded-full border border-green-200 bg-white text-green-600 shadow-sm hover:bg-green-50 transition-colors opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
            onClick={handleDelete}
          >
            <X className="size-4" />
          </button>
        )}

        {/* Connection handle(s) remain functional - counter-transform to keep on right edge */}
        <div
          style={{
            transform: isExpanded ? `translateX(${widthDiff}px)` : "translateX(0)",
            transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {nodesConfig["initial-node"].handles.map(handle => (
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
      </div>
    </>
  )
}
