"use client"

import { cn } from "@/lib/utils"
import { useAppStore } from "@/react-flow-visualization/store/store"
import { useEffect, useRef } from "react"
import { useShallow } from "zustand/react/shallow"
import { AdvancedSection } from "./advanced-section"
import { CoreConfigSection } from "./core-config-section"
import { AgentDetailHeader } from "./header"
import { QuickActionsFooter } from "./quick-actions-footer"
import { ToolsSection } from "./tools-section"

export function AgentDetailPanel() {
  const { isOpen, nodeId, isExpanded, selectedNode, onClose, onToggleExpanded } = useAppStore(
    useShallow(state => ({
      isOpen: state.nodeDetailsOpen,
      nodeId: state.selectedNodeId,
      isExpanded: state.detailPanelExpanded,
      selectedNode: state.nodes.find(n => n.id === state.selectedNodeId),
      onClose: state.closeNodeDetails,
      onToggleExpanded: state.toggleDetailPanelExpanded,
    })),
  )

  const panelRef = useRef<HTMLDialogElement>(null)

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

  // Focus trap - keep focus within panel when open
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      const firstElement = focusableElements[0] as HTMLElement
      if (firstElement) {
        setTimeout(() => firstElement.focus(), 100)
      }
    }
  }, [isOpen, nodeId])

  if (!nodeId || !selectedNode) return null

  // Don't show panel for start/end nodes
  if (selectedNode.type === "initial-node" || selectedNode.type === "output-node") return null

  return (
    <>
      {/* Backdrop - click to close */}
      <div
        className={cn(
          "fixed inset-0 bg-black/10 z-40 transition-all duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel with elastic slide animation */}
      <dialog
        ref={panelRef}
        className={cn(
          "fixed top-0 right-0 h-screen bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 z-50 shadow-2xl overflow-hidden flex flex-col",
          // Elastic easing - Steve would approve
          "transition-all duration-[240ms]",
          isOpen ? "translate-x-0" : "translate-x-full",
          isExpanded ? "w-[680px]" : "w-[420px]",
        )}
        style={{
          transitionTimingFunction: isOpen ? "cubic-bezier(0.34, 1.56, 0.64, 1)" : "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        aria-modal="true"
        aria-label="Agent inspector"
        open
      >
        {/* Header */}
        <AgentDetailHeader
          node={selectedNode}
          isExpanded={isExpanded}
          onClose={onClose}
          onToggleExpanded={onToggleExpanded}
        />

        {/* Content area - scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Core Config - always visible */}
            <CoreConfigSection node={selectedNode} />

            {/* Tools - collapsible */}
            <ToolsSection node={selectedNode} />

            {/* Advanced - collapsed by default */}
            <AdvancedSection node={selectedNode} />
          </div>
        </div>

        {/* Quick Actions - sticky footer */}
        <QuickActionsFooter node={selectedNode} />
      </dialog>
    </>
  )
}
