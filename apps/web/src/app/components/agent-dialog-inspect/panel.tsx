"use client"

import { cn } from "@/lib/utils"
import { useAppStore } from "@/react-flow-visualization/store/store"
import { useEffect, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { ConfigPanel } from "./config-panel"
import { AgentDetailHeader } from "./header"
import { TestPanel } from "./test-panel"

export function AgentDialogInspect() {
  const { isOpen, nodeId, selectedNode, onClose } = useAppStore(
    useShallow(state => ({
      isOpen: state.nodeDetailsOpen,
      nodeId: state.selectedNodeId,
      selectedNode: state.nodes.find(n => n.id === state.selectedNodeId),
      onClose: state.closeNodeDetails,
    })),
  )

  const panelRef = useRef<HTMLDialogElement>(null)
  const [dividerPosition, setDividerPosition] = useState(60) // percentage
  const isDragging = useRef(false)

  // Handle ESC key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  // Handle divider dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !panelRef.current) return

      const rect = panelRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = (x / rect.width) * 100

      // Limit divider position between 30% and 70%
      setDividerPosition(Math.min(70, Math.max(30, percentage)))
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  if (!nodeId || !selectedNode) return null

  // Don't show panel for start/end nodes
  if (selectedNode.type === "initial-node" || selectedNode.type === "output-node") return null

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        className={cn(
          "fixed inset-0 bg-black/20 z-40 transition-all duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Dialog Container */}
      <div
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center p-6 pointer-events-none",
          isOpen ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Dialog - clean rectangular design */}
        <dialog
          ref={panelRef}
          className={cn(
            "bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col pointer-events-auto",
            // Smaller, more focused size
            "w-[85vw] h-[80vh] max-w-[1400px] max-h-[800px]",
            // Smooth animation
            "transition-all duration-200",
            isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0",
          )}
          aria-modal="true"
          aria-label="Agent inspector"
          open={isOpen}
          onContextMenu={e => {
            // Prevent context menu from appearing when right-clicking inside the dialog
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          {/* Header */}
          <AgentDetailHeader node={selectedNode} onClose={onClose} />

          {/* Two-panel layout */}
          <div className="flex-1 flex relative overflow-hidden">
            {/* Left Panel - Test Interface */}
            <div
              className="flex-shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700"
              style={{ width: `${dividerPosition}%` }}
            >
              <TestPanel node={selectedNode} />
            </div>

            {/* Resizable Divider */}
            <div
              className="absolute top-0 bottom-0 w-3 cursor-col-resize group z-10"
              style={{ left: `${dividerPosition}%`, marginLeft: "-6px" }}
              onMouseDown={e => {
                e.preventDefault()
                isDragging.current = true
                document.body.style.cursor = "col-resize"
                document.body.style.userSelect = "none"
              }}
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-300 dark:bg-gray-600 group-hover:bg-blue-500 transition-colors" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center">
                <div className="flex gap-0.5">
                  <div className="w-0.5 h-3 bg-gray-400 dark:bg-gray-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-0.5 h-3 bg-gray-400 dark:bg-gray-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>

            {/* Right Panel - Configuration */}
            <div className="flex-1 overflow-y-auto" style={{ width: `${100 - dividerPosition}%` }}>
              <ConfigPanel node={selectedNode} />
            </div>
          </div>
        </dialog>
      </div>
    </>
  )
}
