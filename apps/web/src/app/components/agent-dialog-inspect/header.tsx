"use client"

import { cn } from "@/lib/utils"
import type { AppNode } from "@/react-flow-visualization/components/nodes/nodes"
import { useAppStore } from "@/react-flow-visualization/store/store"
import { Edit2, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useStatusColor } from "./hooks/use-status-color"

interface AgentDetailHeaderProps {
  node: AppNode
  onClose: () => void
}

export function AgentDetailHeader({ node, onClose }: AgentDetailHeaderProps) {
  const updateNode = useAppStore(state => state.updateNode)
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(node.id)
  const statusColor = useStatusColor(node.data.status)

  // Sync nameDraft when node.id changes
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

  return (
    <div className="h-14 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Status indicator */}
        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", statusColor)} />

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
            className="text-base font-medium bg-transparent border-b border-blue-500 outline-none text-gray-900 dark:text-gray-100 px-0"
          />
        ) : (
          <button type="button" onClick={() => setIsEditingName(true)} className="flex items-center gap-1.5 group">
            <h2 className="text-base font-medium text-gray-900 dark:text-gray-100">{node.id}</h2>
            <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
