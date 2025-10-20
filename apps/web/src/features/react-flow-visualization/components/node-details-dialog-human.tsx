"use client"

import { fetchActiveModelNames, fetchModelV2 } from "@/features/provider-llm-setup/models/client-utils"
import type { WorkflowNodeData } from "@/features/react-flow-visualization/components/nodes/nodes"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/features/react-flow-visualization/components/ui/dialog"
import { Input } from "@/features/react-flow-visualization/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/features/react-flow-visualization/components/ui/select"
import { Switch } from "@/features/react-flow-visualization/components/ui/switch"
import { Textarea } from "@/features/react-flow-visualization/components/ui/textarea"
import { useAppStore } from "@/features/react-flow-visualization/store/store"
// Provider detection handled by client-utils with CLIENT_DEFAULT_PROVIDER
import type { ModelPricing } from "@lucky/shared"
import {
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_MCP_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION,
  type CodeToolName,
  type MCPToolName,
} from "@lucky/tools/client"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

export interface NodeDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeData: WorkflowNodeData
  onSave?: (nodeId: string, updates: Partial<WorkflowNodeData>) => void
}

export function NodeDetailsDialog({ open, onOpenChange, nodeData, onSave }: NodeDetailsDialogProps) {
  const [data, setData] = useState(nodeData)
  const [isEditingId, setIsEditingId] = useState(false)
  const [nodeIdDraft, setNodeIdDraft] = useState(nodeData.nodeId || "")
  const [isToolsExpanded, setIsToolsExpanded] = useState(false)
  const edges = useAppStore(s => s.edges)

  // Prevent auto-save loop when props refresh local state
  const skipNextAutosaveRef = useRef(false)

  const addMcpTool = useCallback(
    (toolName: string) => {
      if (
        toolName &&
        ACTIVE_MCP_TOOL_NAMES.includes(toolName as MCPToolName) &&
        !data.mcpTools?.includes(toolName as MCPToolName)
      ) {
        setData(prev => ({
          ...prev,
          mcpTools: [...(prev.mcpTools || []), toolName as MCPToolName],
        }))
      }
    },
    [data.mcpTools],
  )

  const removeMcpTool = useCallback((index: number) => {
    setData(prev => ({
      ...prev,
      mcpTools: prev.mcpTools?.filter((_, i) => i !== index) || [],
    }))
  }, [])

  const addCodeTool = useCallback(
    (toolName: string) => {
      if (
        toolName &&
        ACTIVE_CODE_TOOL_NAMES.includes(toolName as CodeToolName) &&
        !data.codeTools?.includes(toolName as CodeToolName)
      ) {
        setData(prev => ({
          ...prev,
          codeTools: [...(prev.codeTools || []), toolName as CodeToolName],
        }))
      }
    },
    [data.codeTools],
  )

  const removeCodeTool = useCallback((index: number) => {
    setData(prev => ({
      ...prev,
      codeTools: prev.codeTools?.filter((_, i) => i !== index) || [],
    }))
  }, [])

  const toggleMcpTool = useCallback(
    (toolName: string) => {
      const idx = (data.mcpTools || []).indexOf(toolName as MCPToolName)
      if (idx === -1) {
        addMcpTool(toolName)
      } else {
        removeMcpTool(idx)
      }
    },
    [data.mcpTools, addMcpTool, removeMcpTool],
  )

  const toggleCodeTool = useCallback(
    (toolName: string) => {
      const idx = (data.codeTools || []).indexOf(toolName as CodeToolName)
      if (idx === -1) {
        addCodeTool(toolName)
      } else {
        removeCodeTool(idx)
      }
    },
    [data.codeTools, addCodeTool, removeCodeTool],
  )

  // keyboard shortcuts for tool selection
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // only when alt/option key is held
      if (!e.altKey) return

      // prevent default browser shortcuts
      e.preventDefault()

      // number keys 1-9 for quick tool toggle
      const num = Number.parseInt(e.key)
      if (num >= 1 && num <= 9) {
        // tools in order: first mcp, then code
        const allTools = [...ACTIVE_MCP_TOOL_NAMES, ...ACTIVE_CODE_TOOL_NAMES]
        const toolIndex = num - 1

        if (toolIndex < allTools.length) {
          const tool = allTools[toolIndex]
          if (ACTIVE_MCP_TOOL_NAMES.includes(tool as MCPToolName)) {
            toggleMcpTool(tool)
          } else {
            toggleCodeTool(tool)
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, data.mcpTools, data.codeTools, toggleCodeTool, toggleMcpTool])

  // Auto-save on user edits only
  useEffect(() => {
    if (!onSave) return
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false
      return
    }
    if (JSON.stringify(data) === JSON.stringify(nodeData)) return
    const timeoutId = setTimeout(() => {
      onSave(nodeData.nodeId, data)
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [data, nodeData, onSave])

  // Reset when node changes
  useEffect(() => {
    skipNextAutosaveRef.current = true
    setData(nodeData)
    setNodeIdDraft(nodeData.nodeId || "")
    setIsEditingId(false)
    setIsToolsExpanded(false)
  }, [nodeData])

  const outEdgeCount = useMemo(() => edges.filter(e => e.source === nodeData.nodeId).length, [edges, nodeData.nodeId])
  const canSetHandOffType = (data.handOffs?.length || 0) > 1 || outEdgeCount > 1

  // const addHandoff = () => {
  //   if (newHandoff.trim()) {
  //     setData((prev) => ({
  //       ...prev,
  //       handOffs: [...(prev.handOffs || []), newHandoff.trim()],
  //     }))
  //     setNewHandoff("")
  //   }
  // }

  // const removeHandoff = (index: number) => {
  //   setData((prev) => ({
  //     ...prev,
  //     handOffs: prev.handOffs?.filter((_, i) => i !== index) || [],
  //   }))
  // }

  const [selectedModelPricing, setSelectedModelPricing] = useState<ModelPricing | null>(null)
  const [activeModels, setActiveModels] = useState<string[]>([])

  // Fetch active models on mount
  useEffect(() => {
    fetchActiveModelNames().then(models => setActiveModels(models.map(m => String(m))))
  }, [])

  // Fetch model pricing when model changes
  useEffect(() => {
    if (!data?.modelName) {
      setSelectedModelPricing(null)
      return
    }
    fetchModelV2(data.modelName)
      .then(pricing => setSelectedModelPricing(pricing))
      .catch(() => setSelectedModelPricing(null))
  }, [data?.modelName])

  // show raw model id (e.g., gpt-4.1-mini for openai provider)
  const formatModelDisplayName = (modelName?: string) => modelName || ""

  // Provider is hardcoded to "openai" in client (see client-utils.ts)
  // MUST match BROWSER_DEFAULT_PROVIDER in client-utils.ts
  const providerId = "openai"

  const formatDollars = (value?: number | null) => {
    if (value === null || value === undefined) return "-"
    return `$${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 3,
    }).format(value)}`
  }

  const commitNodeId = () => {
    const trimmed = nodeIdDraft.trim()
    if (trimmed && trimmed !== data.nodeId) {
      setData(prev => ({ ...prev, nodeId: trimmed }))
    }
    setIsEditingId(false)
  }

  const cancelNodeIdEdit = () => {
    setNodeIdDraft(data.nodeId || "")
    setIsEditingId(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex justify-center -mt-1">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              Node editor
            </span>
          </div>
          <VisuallyHidden>
            <DialogTitle>Node settings</DialogTitle>
          </VisuallyHidden>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              {isEditingId ? (
                <Input
                  value={nodeIdDraft}
                  onChange={e => setNodeIdDraft(e.target.value)}
                  onBlur={commitNodeId}
                  onKeyDown={e => {
                    if (e.key === "Enter") commitNodeId()
                    if (e.key === "Escape") cancelNodeIdEdit()
                  }}
                  autoFocus
                  placeholder="Node ID"
                  className="h-10 text-base"
                />
              ) : (
                <div
                  className="h-10 flex items-center text-base text-slate-900 cursor-text"
                  onClick={() => {
                    setNodeIdDraft(data.nodeId || "")
                    setIsEditingId(true)
                  }}
                  title="Click to edit ID"
                >
                  {data.nodeId}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 h-full overflow-hidden">
          {/* Left: Core Configuration */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="node-description" className="text-sm text-gray-700">
                Description
              </label>
              <Textarea
                id="node-description"
                value={data.description || ""}
                onChange={e =>
                  setData(prev => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="What should this node do?"
                className="min-h-[64px] resize-none border-gray-200 text-sm leading-relaxed px-3 py-2 [text-indent:0] focus:border-gray-400"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="node-instructions" className="text-sm text-gray-700">
                Instructions
              </label>
              <Textarea
                id="node-instructions"
                value={data.systemPrompt || ""}
                onChange={e =>
                  setData(prev => ({
                    ...prev,
                    systemPrompt: e.target.value,
                  }))
                }
                placeholder="How should it accomplish this?"
                className="min-h-[120px] resize-none border-gray-200 text-sm leading-relaxed px-3 py-2 [text-indent:0] focus:border-gray-400"
              />
            </div>

            <div className="flex items-center gap-3">
              <label htmlFor="node-model" className="text-sm text-gray-700 w-20">
                Model
              </label>
              <Select
                value={data.modelName || ""}
                onValueChange={value =>
                  setData(prev => ({
                    ...prev,
                    modelName: value as string,
                  }))
                }
              >
                <SelectTrigger id="node-model" className="w-full h-9 text-sm border-gray-200">
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {activeModels.map(model => (
                    <SelectItem key={model} value={model}>
                      {formatModelDisplayName(model)} + {providerId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedModelPricing && (
              <div className="pl-20 text-xs text-slate-600">
                <span>Input {formatDollars(selectedModelPricing.input)}/1M</span>
                <span className="mx-2">•</span>
                <span>Output {formatDollars(selectedModelPricing.output)}/1M</span>
              </div>
            )}

            {/* Human-in-the-loop gate toggle */}
            <div className="flex items-center gap-3 pt-2">
              <label htmlFor="requires-approval" className="text-sm text-gray-700 w-20">
                Gate
              </label>
              <div className="flex items-center gap-2">
                <Switch
                  id="requires-approval"
                  checked={data.requiresApproval ?? false}
                  onCheckedChange={checked =>
                    setData(prev => ({
                      ...prev,
                      requiresApproval: checked,
                    }))
                  }
                />
                <span className="text-xs text-gray-600">Require approval before continuing</span>
              </div>
            </div>

            {/* Gate configuration - only shown when gate is enabled */}
            {data.requiresApproval && (
              <div className="space-y-3 pl-20 pt-2 pb-2 border-l-2 border-amber-200 dark:border-amber-800">
                <div className="space-y-2">
                  <label htmlFor="approval-prompt" className="text-sm text-gray-700 font-medium">
                    Instructions
                  </label>
                  <Textarea
                    id="approval-prompt"
                    value={data.approvalPrompt || ""}
                    onChange={e =>
                      setData(prev => ({
                        ...prev,
                        approvalPrompt: e.target.value,
                      }))
                    }
                    placeholder="What should the human review?"
                    className="min-h-[60px] resize-none border-amber-200 text-sm leading-relaxed px-3 py-2 [text-indent:0] focus:border-amber-400"
                  />
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>When agent completes:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>Workflow pauses</li>
                    <li>Human reviews output</li>
                    <li>Approve → continues to next node</li>
                    <li>Reject → provide new instructions to this agent</li>
                  </ul>
                </div>
              </div>
            )}

            {canSetHandOffType && (
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <label htmlFor="node-handoff" className="text-sm text-gray-700 w-20">
                    Handoff
                  </label>
                  <Select
                    value={data.handOffType || "sequential"}
                    onValueChange={value =>
                      setData(prev => ({
                        ...prev,
                        handOffType: value === "parallel" ? ("parallel" as const) : undefined,
                      }))
                    }
                  >
                    <SelectTrigger
                      id="node-handoff"
                      className="w-full h-9 text-sm border-gray-200 focus:ring-0 focus:outline-none"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sequential">Sequential (default)</SelectItem>
                      <SelectItem value="parallel">Parallel (fan-out)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-sm text-gray-700">Connections</div>
              <div className="flex flex-wrap gap-1.5">
                {data.handOffs?.map((handoff, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-700"
                    title={handoff}
                  >
                    {handoff}
                  </span>
                ))}
                {(!data.handOffs || data.handOffs.length === 0) && (
                  <div className="text-xs text-gray-500">Connections are managed in the graph view</div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Tools */}
          <div className="space-y-4 border-l pl-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-normal">Tools</h3>
              <button
                type="button"
                onClick={() => setIsToolsExpanded(!isToolsExpanded)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label={isToolsExpanded ? "Collapse tools" : "Expand tools"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${isToolsExpanded ? "rotate-180" : ""}`}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>

            {isToolsExpanded && (
              <div className="space-y-6">
                {/* MCP tools */}
                <div className="space-y-2">
                  <h4 className="text-sm text-gray-600">Web & API</h4>
                  <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 divide-y">
                    {ACTIVE_MCP_TOOL_NAMES.map((tool, index) => {
                      const selected = data.mcpTools?.includes(tool)
                      const description = ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION[tool] || ""
                      return (
                        <button
                          key={tool}
                          type="button"
                          onClick={() => toggleMcpTool(tool)}
                          aria-pressed={selected}
                          className={`w-full text-left px-3 py-2 cursor-pointer transition-colors ${
                            selected ? "bg-slate-50" : "bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={`mt-0.5 h-4 w-4 flex items-center justify-center rounded-sm border ${
                                selected ? "bg-slate-600 border-slate-600" : "bg-white border-gray-300"
                              }`}
                            >
                              {selected && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="3"
                                  className="h-3 w-3"
                                >
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-800">{tool}</span>
                                {index + 1 <= 9 && (
                                  <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-600 rounded border border-slate-200">
                                    ⌥{index + 1}
                                  </kbd>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 line-clamp-2">{description}</div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Code tools */}
                <div className="space-y-2">
                  <h4 className="text-sm text-gray-600">Code & Files</h4>
                  <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 divide-y">
                    {ACTIVE_CODE_TOOL_NAMES.map((tool, index) => {
                      const selected = data.codeTools?.includes(tool)
                      const description = ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION[tool] || ""
                      return (
                        <button
                          key={tool}
                          type="button"
                          onClick={() => toggleCodeTool(tool)}
                          aria-pressed={selected}
                          className={`w-full text-left px-3 py-2 cursor-pointer transition-colors ${
                            selected ? "bg-slate-50" : "bg-white hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className={`mt-0.5 h-4 w-4 flex items-center justify-center rounded-sm border ${
                                selected ? "bg-slate-600 border-slate-600" : "bg-white border-gray-300"
                              }`}
                            >
                              {selected && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="3"
                                  className="h-3 w-3"
                                >
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-800">{tool}</span>
                                {ACTIVE_MCP_TOOL_NAMES.length + index + 1 <= 9 && (
                                  <kbd className="hidden sm:inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 text-slate-600 rounded border border-slate-200">
                                    ⌥{ACTIVE_MCP_TOOL_NAMES.length + index + 1}
                                  </kbd>
                                )}
                              </div>
                              <div className="text-xs text-slate-600 line-clamp-2">{description}</div>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {data.status && data.status !== "initial" && (
              <div className="space-y-2">
                <h3 className="text-base font-normal">Status</h3>
                <div className="p-2.5 border border-gray-200 rounded">
                  <div className="text-sm capitalize">{data.status || "ready"}</div>
                  {data.messageCount !== undefined && data.messageCount > 0 && (
                    <div className="text-xs text-gray-500 mt-1">{data.messageCount} messages processed</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground text-center">Changes are saved automatically</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
