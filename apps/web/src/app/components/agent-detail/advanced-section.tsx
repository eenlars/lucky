"use client"

import type { AppNode } from "@/features/react-flow-visualization/components/nodes/nodes"
import { useAppStore } from "@/features/react-flow-visualization/store/store"
import { Settings } from "lucide-react"
import { useEffect, useState } from "react"
import { CollapsibleSection } from "./collapsible-section"
import { useDebouncedUpdate } from "./hooks/use-debounced-update"

interface AdvancedSectionProps {
  node: AppNode
}

export function AdvancedSection({ node }: AdvancedSectionProps) {
  const updateNode = useAppStore(state => state.updateNode)

  // FIX: Use shared debounced update hook
  const debouncedUpdate = useDebouncedUpdate(node.id, updateNode, 500)

  // FIX: Make systemPrompt controlled
  const [systemPrompt, setSystemPrompt] = useState(node.data.systemPrompt || "")

  useEffect(() => {
    setSystemPrompt(node.data.systemPrompt || "")
  }, [node.data.systemPrompt])

  const handoffType = node.data.handOffType || "sequential"
  const connections = node.data.handOffs || []

  return (
    <CollapsibleSection title="Advanced" icon={<Settings className="w-4 h-4" />} defaultOpen={false}>
      <div className="space-y-4">
        {/* Instructions */}
        <div className="space-y-2">
          <label
            htmlFor="agent-detail-instructions-textarea"
            className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide"
          >
            Instructions
          </label>
          <textarea
            id="agent-detail-instructions-textarea"
            value={systemPrompt}
            onChange={e => {
              setSystemPrompt(e.target.value)
              debouncedUpdate({ systemPrompt: e.target.value })
            }}
            placeholder="How should this agent accomplish its task?"
            rows={4}
            className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none transition-all leading-relaxed font-mono"
          />
        </div>

        {/* Handoff Type */}
        {connections.length > 1 && (
          <div className="space-y-2">
            <label
              htmlFor="agent-detail-handoff-strategy-select"
              className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide"
            >
              Handoff Strategy
            </label>
            <select
              id="agent-detail-handoff-strategy-select"
              value={handoffType}
              onChange={e =>
                updateNode(node.id, {
                  handOffType: e.target.value === "parallel" ? ("parallel" as const) : undefined,
                })
              }
              className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
            >
              <option value="sequential">Sequential (one after another)</option>
              <option value="parallel">Parallel (all at once)</option>
            </select>
          </div>
        )}

        {/* Connections - read-only display */}
        {connections.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Connections
            </div>
            <div className="flex flex-wrap gap-1.5">
              {connections.map((target, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                >
                  → {target}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Managed in graph view - drag connections to update
            </p>
          </div>
        )}

        {/* Memory - if present */}
        {node.data.memory && Object.keys(node.data.memory).length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Memory</div>
            <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 space-y-1">
              {Object.entries(node.data.memory).map(([key, value], idx) => (
                <div key={idx} className="text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>{" "}
                  <span className="text-gray-600 dark:text-gray-400">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </CollapsibleSection>
  )
}
