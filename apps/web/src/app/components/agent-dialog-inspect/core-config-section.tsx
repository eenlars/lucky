"use client"

import type { AppNode } from "@/features/react-flow-visualization/components/nodes/nodes"
import { useAppStore } from "@/features/react-flow-visualization/store/store"
import { getActiveModelNames, getModelV2 } from "@/lib/models/client-utils"
import type { AllowedModelName } from "@lucky/core/utils/spending/models.types"
import { useEffect, useMemo, useState } from "react"
import { useDebouncedUpdate } from "./hooks/use-debounced-update"

interface CoreConfigSectionProps {
  node: AppNode
}

export function CoreConfigSection({ node }: CoreConfigSectionProps) {
  const updateNode = useAppStore(state => state.updateNode)

  // FIX: Use shared debounced update hook
  const debouncedUpdate = useDebouncedUpdate(node.id, updateNode, 500)

  // FIX: Make description controlled to reflect external updates
  const [description, setDescription] = useState(node.data.description || "")

  // Sync when node changes
  useEffect(() => {
    setDescription(node.data.description || "")
  }, [node.data.description])

  const activeModels = useMemo(() => getActiveModelNames().map(m => String(m)), [])

  const selectedModel = useMemo(() => {
    if (!node.data.modelName) return null
    try {
      return getModelV2(node.data.modelName)
    } catch {
      return null
    }
  }, [node.data.modelName])

  const formatPrice = (value?: number | null) => {
    if (value === null || value === undefined) return "-"
    return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(value)}`
  }

  return (
    <div className="space-y-4">
      {/* Model Selector */}
      <div className="space-y-2">
        <label
          htmlFor="model-selector"
          className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide"
        >
          Model
        </label>
        <select
          id="model-selector"
          value={node.data.modelName || ""}
          onChange={e =>
            updateNode(node.id, {
              modelName: e.target.value as AllowedModelName,
            })
          }
          className="w-full h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
        >
          <option value="">Select model...</option>
          {activeModels.map(model => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        {selectedModel && (
          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span>In: {formatPrice(selectedModel.input)}/1M</span>
            <span>•</span>
            <span>Out: {formatPrice(selectedModel.output)}/1M</span>
          </div>
        )}
      </div>

      {/* FIX: Controlled component */}
      <div className="space-y-2">
        <label
          htmlFor="description-textarea"
          className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide"
        >
          Description
        </label>
        <textarea
          id="description-textarea"
          value={description}
          onChange={e => {
            setDescription(e.target.value)
            debouncedUpdate({ description: e.target.value })
          }}
          placeholder="What should this agent do?"
          rows={2}
          className="w-full px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-none transition-all leading-relaxed"
        />
      </div>
    </div>
  )
}
