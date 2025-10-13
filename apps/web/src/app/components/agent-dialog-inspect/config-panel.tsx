"use client"

import { SyncStatusBadge } from "@/components/providers/sync-status-badge"
import type { AppNode } from "@/features/react-flow-visualization/components/nodes/nodes"
import { useAppStore } from "@/features/react-flow-visualization/store/store"
import { useFeatureFlag } from "@/lib/feature-flags"
import { PROVIDER_CONFIGS } from "@/lib/providers/provider-utils"
import { cn } from "@/lib/utils"
import { useModelPreferencesStore } from "@/stores/model-preferences-store"
import type { AnyModelName } from "@lucky/core/utils/spending/models.types"
import { MODEL_CATALOG, getModelsByProvider } from "@lucky/models"
import {
  ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION,
  type CodeToolName,
  type MCPToolName,
} from "@lucky/tools/client"
import { ChevronDown } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

// Get available providers dynamically from PROVIDER_CONFIGS, excluding disabled ones
const PROVIDERS = Object.keys(PROVIDER_CONFIGS).filter(provider => !PROVIDER_CONFIGS[provider].disabled)

interface ConfigPanelProps {
  node: AppNode
}

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-6 py-4 flex items-center justify-between transition-all",
          isOpen
            ? "bg-gray-50 dark:bg-gray-800/50"
            : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/30",
        )}
      >
        <h3
          className={cn(
            "text-sm font-semibold transition-colors",
            isOpen ? "text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400",
          )}
        >
          {title}
        </h3>
        <ChevronDown
          className={cn(
            "w-4 h-4 transition-all duration-200",
            isOpen ? "rotate-180 text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500",
          )}
        />
      </button>
      <div
        className={cn("transition-all duration-200 ease-out overflow-hidden", isOpen ? "max-h-[1000px]" : "max-h-0")}
      >
        <div className={cn("px-6 py-4", "bg-white dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800")}>
          {children}
        </div>
      </div>
    </div>
  )
}

export function ConfigPanel({ node }: ConfigPanelProps) {
  const updateNode = useAppStore(state => state.updateNode)
  const toolsEnabled = useFeatureFlag("MCP_TOOLS")

  // Zustand store for model preferences
  const { isLoading, loadPreferences, getEnabledModels, isStale, lastSynced, forceRefresh } = useModelPreferencesStore()

  const [description, setDescription] = useState(node.data.description || "")
  const [systemPrompt, setSystemPrompt] = useState(node.data.systemPrompt || "")
  const mcpTools = node.data.mcpTools || []
  const codeTools = node.data.codeTools || []

  // Provider and model state
  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    // Look up model in catalog to get actual provider (don't parse model ID string!)
    if (node.data.modelName) {
      const catalogEntry = MODEL_CATALOG.find(entry => entry.id === node.data.modelName)
      if (catalogEntry && PROVIDERS.includes(catalogEntry.provider)) {
        return catalogEntry.provider
      }
    }
    return PROVIDERS[0] || "openai"
  })

  // Track the current provider to prevent race conditions when switching providers
  const currentProviderRef = useRef(selectedProvider)

  // Update ref when provider changes
  useEffect(() => {
    currentProviderRef.current = selectedProvider
  }, [selectedProvider])

  // Load preferences on mount - always refresh to get latest from server
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  // Compute available models based on user preferences and selected provider
  const availableModels = useMemo(() => {
    // Guard: Only compute if this is still the current provider (prevents race conditions)
    const providerToFetch = selectedProvider
    if (providerToFetch !== currentProviderRef.current) {
      return []
    }

    // Get all models for the provider from catalog
    const allModels = getModelsByProvider(providerToFetch).filter(m => m.active)
    const catalogMap = new Map(allModels.map(m => [m.model, m]))

    // Get user's enabled models for this provider
    const enabledModelIds = getEnabledModels(providerToFetch)

    // If user has enabled specific models, show those (even if not in catalog)
    if (enabledModelIds.length > 0) {
      // IMPORTANT: enabledModelIds contains provider-specific model names (e.g., "gpt-5-nano")
      // We must match by m.model, not m.id (which is "openai/gpt-5-nano")
      const result = enabledModelIds.map(modelName => {
        const catalogEntry = catalogMap.get(modelName)
        if (catalogEntry) {
          return catalogEntry
        }
        // Model not in catalog - create a minimal entry so it can still be selected
        // This handles new provider models not yet added to our static catalog
        return {
          id: `${providerToFetch}/${modelName}`,
          model: modelName,
          provider: providerToFetch,
          active: true,
          contextLength: 0,
          intelligence: 5,
          speed: "medium" as const,
          input: 0,
          output: 0,
          supportsTools: false,
          supportsVision: false,
          supportsReasoning: false,
          supportsAudio: false,
          supportsVideo: false,
          cachedInput: null,
        }
      })
      return result
    }

    // Otherwise show all catalog models
    return allModels
  }, [selectedProvider, getEnabledModels])

  // Sync state when node changes
  useEffect(() => {
    setDescription(node.data.description || "")
    setSystemPrompt(node.data.systemPrompt || "")
  }, [node.id, node.data.description, node.data.systemPrompt])

  // Auto-save description after delay
  useEffect(() => {
    // Only set timer if the value actually changed from what's in node.data
    if (description === node.data.description) return

    const timer = setTimeout(() => {
      updateNode(node.id, { description: description })
    }, 500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description]) // Only depend on description, not node.data

  // Auto-save system prompt after delay
  useEffect(() => {
    // Only set timer if the value actually changed from what's in node.data
    if (systemPrompt === node.data.systemPrompt) return

    const timer = setTimeout(() => {
      updateNode(node.id, { systemPrompt: systemPrompt })
    }, 500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemPrompt]) // Only depend on systemPrompt, not node.data

  const toggleTool = useCallback(
    (toolName: string, type: "mcp" | "code") => {
      // Disable all tool toggling when feature flag is off
      if (!toolsEnabled) return
      if (type === "mcp") {
        const current = node.data.mcpTools || []
        const newTools = current.includes(toolName as MCPToolName)
          ? current.filter(t => t !== toolName)
          : [...current, toolName as MCPToolName]
        updateNode(node.id, { mcpTools: newTools })
      } else {
        const current = node.data.codeTools || []
        const newTools = current.includes(toolName as CodeToolName)
          ? current.filter(t => t !== toolName)
          : [...current, toolName as CodeToolName]
        updateNode(node.id, { codeTools: newTools })
      }
    },
    [toolsEnabled, node.data.mcpTools, node.data.codeTools, node.id, updateNode],
  )

  const totalTools = mcpTools.length + codeTools.length

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Core Configuration - Collapsible */}
      <CollapsibleSection title="Core Configuration" defaultOpen={false}>
        <div className="space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Description</h3>
            <div className="relative">
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Briefly describe what this agent does..."
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-300 dark:focus:border-gray-600 focus:bg-white dark:focus:bg-gray-800 transition-all resize-none leading-relaxed"
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-500">
                {description.length} chars
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              A short summary of this agent&apos;s purpose and role
            </p>
          </div>

          {/* System Prompt */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">System Prompt</h3>
            <div className="relative">
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                placeholder="Enter instructions for this agent..."
                rows={8}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-gray-300 dark:focus:border-gray-600 focus:bg-white dark:focus:bg-gray-800 transition-all resize-none font-mono leading-relaxed"
                style={{ minHeight: "160px" }}
              />
              <div className="absolute bottom-3 right-3 text-xs text-gray-400 dark:text-gray-500">
                {systemPrompt.length} chars
              </div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Define how this agent should behave and respond
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Tools Section - Collapsible */}
      <CollapsibleSection title={`Tools (${totalTools} selected)`} defaultOpen={false}>
        {!toolsEnabled && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-primary">
                  <path d="M12 17a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M17 8V7a5 5 0 10-10 0v1H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2v-9a2 2 0 00-2-2h-2zm-8-1a3 3 0 116 0v1H9V7z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground mb-1">Tools disabled</p>
                <p className="text-xs text-muted-foreground">Tools are disabled until the feature is enabled.</p>
              </div>
            </div>
          </div>
        )}
        {/* MCP Tools */}
        {toolsEnabled && Object.entries(ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION).length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">MCP Tools</p>
              <span className="text-xs text-gray-500 dark:text-gray-400">{mcpTools.length} selected</span>
            </div>
            <div className="space-y-2">
              {Object.entries(ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION).map(([key, description]) => {
                const isSelected = mcpTools.includes(key as MCPToolName)
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggleTool(key, "mcp")}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      isSelected
                        ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-800/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{key}</p>
                        <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">{description}</p>
                      </div>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-sm border transition-all flex-shrink-0 ml-2",
                          isSelected
                            ? "border-gray-400 dark:border-gray-500 bg-gray-900 dark:bg-gray-100"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800",
                        )}
                      >
                        {isSelected && (
                          <svg
                            className="w-full h-full p-0.5 text-white dark:text-gray-900"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Code Tools */}
        {toolsEnabled && Object.entries(ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION).length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Code Tools
              </p>
              <span className="text-xs text-gray-500 dark:text-gray-400">{codeTools.length} selected</span>
            </div>
            <div className="space-y-2">
              {Object.entries(ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION).map(([key, description]) => {
                const isSelected = codeTools.includes(key as CodeToolName)
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => toggleTool(key, "code")}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      isSelected
                        ? "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/30 hover:bg-gray-50 dark:hover:bg-gray-800/30",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{key}</p>
                        <p className="text-xs mt-0.5 text-gray-500 dark:text-gray-400">{description}</p>
                      </div>
                      <div
                        className={cn(
                          "w-4 h-4 rounded-sm border transition-all flex-shrink-0 ml-2",
                          isSelected
                            ? "border-gray-400 dark:border-gray-500 bg-gray-900 dark:bg-gray-100"
                            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800",
                        )}
                      >
                        {isSelected && (
                          <svg
                            className="w-full h-full p-0.5 text-white dark:text-gray-900"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </CollapsibleSection>

      {/* Advanced Configuration - Collapsed by default */}
      <CollapsibleSection title="Advanced Configuration" defaultOpen={false}>
        <div className="space-y-4">
          {/* Sync Status */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">Model preferences sync status</p>
            <SyncStatusBadge
              lastSynced={lastSynced}
              isStale={isStale()}
              isLoading={isLoading}
              onRefresh={forceRefresh}
            />
          </div>

          {/* Model Provider Selection */}
          <div>
            <label htmlFor="model-provider" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model Provider
            </label>
            <select
              id="model-provider"
              value={selectedProvider}
              onChange={e => setSelectedProvider(e.target.value)}
              className="w-full px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              {PROVIDERS.map(provider => (
                <option key={provider} value={provider}>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Model Selection */}
          <div>
            <label htmlFor="model-name" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model
            </label>
            <select
              id="model-name"
              value={node.data.modelName || ""}
              onChange={e =>
                updateNode(node.id, {
                  modelName: e.target.value as AnyModelName,
                })
              }
              disabled={isLoading}
              className="w-full px-3 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <option value="">Loading models...</option>
              ) : availableModels.length === 0 ? (
                <option value="">No models enabled</option>
              ) : (
                availableModels.map(model => (
                  <option key={model.id} value={model.id}>
                    {model.model}
                  </option>
                ))
              )}
            </select>

            {/* Link to manage models */}
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              <a
                href={`/settings/providers/${selectedProvider}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Manage {selectedProvider} models →
              </a>
            </p>

            {/* Model Metadata Display */}
            {!isLoading &&
              node.data.modelName &&
              availableModels.length > 0 &&
              (() => {
                const selectedModel = availableModels.find(m => m.id === node.data.modelName)
                if (!selectedModel) return null

                return (
                  <div className="mt-2 p-2 rounded-md bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {selectedModel.supportsTools && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          Tools
                        </span>
                      )}
                      {selectedModel.supportsVision && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                          Vision
                        </span>
                      )}
                      {selectedModel.speed === "fast" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Fast
                        </span>
                      )}
                      {selectedModel.speed === "slow" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          Slow
                        </span>
                      )}
                      {selectedModel.intelligence >= 8 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
                          High IQ
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                      <div>{selectedModel.contextLength.toLocaleString()} tokens context</div>
                      <div>
                        ${selectedModel.input.toFixed(2)} / ${selectedModel.output.toFixed(2)} per 1M tokens
                        {selectedModel.cachedInput !== null && (
                          <span className="ml-1 text-gray-500">(cached: ${selectedModel.cachedInput.toFixed(2)})</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
          </div>

          {/* Warning when no models are enabled */}
          {!isLoading && availableModels.length === 0 && (
            <div className="mt-4 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-1">
                No models enabled for {selectedProvider}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Enable models in{" "}
                <a
                  href={`/settings/providers/${selectedProvider}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-yellow-900 dark:hover:text-yellow-100"
                >
                  provider settings
                </a>{" "}
                to use this agent.
              </p>
            </div>
          )}
        </div>
      </CollapsibleSection>
    </div>
  )
}
