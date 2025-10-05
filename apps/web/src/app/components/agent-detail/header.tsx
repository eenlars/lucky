"use client"

import { cn } from "@/lib/utils"
import type { AppNode } from "@/react-flow-visualization/components/nodes/nodes"
import { useAppStore } from "@/react-flow-visualization/store/store"
import { Edit2, Maximize2, Minimize2, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useStatusColor } from "./hooks/use-status-color"

interface AgentDetailHeaderProps {
  node: AppNode
  isExpanded: boolean
  onClose: () => void
  onToggleExpanded: () => void
}

export function AgentDetailHeader({ node, isExpanded, onClose, onToggleExpanded }: AgentDetailHeaderProps) {
  const updateNode = useAppStore(state => state.updateNode)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(node.id)

  // FIX: Sync nameDraft when node.id changes
  useEffect(() => {
    setNameDraft(node.id)
  }, [node.id])

  const handleNameSave = useCallback(() => {
    const trimmed = nameDraft.trim()
    if (trimmed && trimmed !== node.id) {
      updateNode(node.id, { nodeId: trimmed })
    }
    setIsEditingName(false)
  }, [nameDraft, node.id, updateNode])

  const handleNameCancel = useCallback(() => {
    setNameDraft(node.id)
    setIsEditingName(false)
  }, [node.id])

  // FIX: Use memoized hook instead of inline computation
  const statusColor = useStatusColor(node.data.status)

  return (
    <div className="h-[70px] flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Icon - generated from node type/model */}
        <div className="w-7 h-7 rounded bg-blue-500 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm">{node.id.charAt(0).toUpperCase()}</span>
        </div>

        {/* Editable node name - click to edit */}
        {isEditingName ? (
          <input
            type="text"
            value={nameDraft}
            onChange={e => setNameDraft(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={e => {
              if (e.key === "Enter") handleNameSave()
              if (e.key === "Escape") handleNameCancel()
            }}
            className="flex-1 min-w-0 text-lg font-semibold bg-transparent border-none outline-none focus:outline-none text-gray-900 dark:text-gray-100 px-0"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="flex items-center gap-2 group flex-1 min-w-0 text-left"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{node.id}</h2>
            <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          </button>
        )}

        {/* Status indicator */}
        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusColor)} title={node.data.status || "idle"} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 ml-4">
        {/* Expand/Collapse */}
        <button
          onClick={onToggleExpanded}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
          aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
          title={isExpanded ? "Collapse (smaller view)" : "Expand (wider view)"}
        >
          {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Close */}
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
          aria-label="Close inspector"
          title="Close (ESC)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
