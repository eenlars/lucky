"use client"

import { WorkflowNodeData } from "@/react-flow-visualization/components/nodes"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/react-flow-visualization/components/ui/dialog"
import { Input } from "@/react-flow-visualization/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-flow-visualization/components/ui/select"
import { Textarea } from "@/react-flow-visualization/components/ui/textarea"
import { useAppStore } from "@/react-flow-visualization/store"
import {
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_MCP_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION,
  type CodeToolName,
  type MCPToolName,
} from "@core/tools/tool.types"
import { getActiveModelNames, getModelV2 } from "@core/utils/spending/functions"
import type {
  AllowedModelName,
  ModelPricingV2,
} from "@core/utils/spending/models.types"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { useEffect, useMemo, useRef, useState } from "react"

export interface NodeDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  nodeData: WorkflowNodeData
  onSave?: (nodeId: string, updates: Partial<WorkflowNodeData>) => void
}

export function NodeDetailsDialog({
  open,
  onOpenChange,
  nodeData,
  onSave,
}: NodeDetailsDialogProps) {
  const [data, setData] = useState(nodeData)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(nodeData.title || "")
  const edges = useAppStore((s) => s.edges)

  // Prevent auto-save loop when props refresh local state
  const skipNextAutosaveRef = useRef(false)

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
    setTitleDraft(nodeData.title || "")
    setIsEditingTitle(false)
  }, [nodeData])

  const addMcpTool = (toolName: string) => {
    if (
      toolName &&
      ACTIVE_MCP_TOOL_NAMES.includes(toolName as MCPToolName) &&
      !data.mcpTools?.includes(toolName as MCPToolName)
    ) {
      setData((prev) => ({
        ...prev,
        mcpTools: [...(prev.mcpTools || []), toolName as MCPToolName],
      }))
    }
  }

  const removeMcpTool = (index: number) => {
    setData((prev) => ({
      ...prev,
      mcpTools: prev.mcpTools?.filter((_, i) => i !== index) || [],
    }))
  }

  const addCodeTool = (toolName: string) => {
    if (
      toolName &&
      ACTIVE_CODE_TOOL_NAMES.includes(toolName as CodeToolName) &&
      !data.codeTools?.includes(toolName as CodeToolName)
    ) {
      setData((prev) => ({
        ...prev,
        codeTools: [...(prev.codeTools || []), toolName as CodeToolName],
      }))
    }
  }

  const removeCodeTool = (index: number) => {
    setData((prev) => ({
      ...prev,
      codeTools: prev.codeTools?.filter((_, i) => i !== index) || [],
    }))
  }

  const toggleMcpTool = (toolName: string) => {
    const idx = (data.mcpTools || []).indexOf(toolName as MCPToolName)
    if (idx === -1) {
      addMcpTool(toolName)
    } else {
      removeMcpTool(idx)
    }
  }

  const toggleCodeTool = (toolName: string) => {
    const idx = (data.codeTools || []).indexOf(toolName as CodeToolName)
    if (idx === -1) {
      addCodeTool(toolName)
    } else {
      removeCodeTool(idx)
    }
  }

  const outEdgeCount = useMemo(
    () => edges.filter((e) => e.source === nodeData.nodeId).length,
    [edges, nodeData.nodeId]
  )
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

  const selectedModelPricing: ModelPricingV2 | null = useMemo(() => {
    if (!data?.modelName) return null
    try {
      return getModelV2(data.modelName)
    } catch {
      return null
    }
  }, [data?.modelName])

  const formatDollars = (value?: number | null) => {
    if (value === null || value === undefined) return "-"
    return `$${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 3,
    }).format(value)}`
  }

  const commitTitle = () => {
    const trimmed = titleDraft.trim()
    if (trimmed !== data.title) {
      setData((prev) => ({ ...prev, title: trimmed }))
    }
    setIsEditingTitle(false)
  }

  const cancelTitleEdit = () => {
    setTitleDraft(data.title || "")
    setIsEditingTitle(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <VisuallyHidden>
            <DialogTitle>Node settings</DialogTitle>
          </VisuallyHidden>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              {isEditingTitle ? (
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={commitTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitTitle()
                    if (e.key === "Escape") cancelTitleEdit()
                  }}
                  autoFocus
                  placeholder="Node name"
                  className="h-10 text-base"
                />
              ) : (
                <div
                  className="h-10 flex items-center text-base text-slate-900 cursor-text"
                  onClick={() => {
                    setTitleDraft(data.title || "")
                    setIsEditingTitle(true)
                  }}
                  title="Click to edit name"
                >
                  {data.title || "Untitled node"}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 h-full overflow-hidden">
          {/* Left: Core Configuration */}
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm text-gray-700">Description</label>
              <Textarea
                value={data.description || ""}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="What should this node do?"
                className="min-h-[64px] resize-none border-gray-200 text-sm leading-relaxed px-3 py-2 [text-indent:0] focus:border-gray-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-gray-700">Instructions</label>
              <Textarea
                value={data.systemPrompt || ""}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    systemPrompt: e.target.value,
                  }))
                }
                placeholder="How should it accomplish this?"
                className="min-h-[120px] resize-none border-gray-200 text-sm leading-relaxed px-3 py-2 [text-indent:0] focus:border-gray-400"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-700 w-20">Model</label>
              <Select
                value={data.modelName}
                onValueChange={(value) =>
                  setData((prev) => ({
                    ...prev,
                    modelName: value as AllowedModelName,
                  }))
                }
              >
                <SelectTrigger className="w-full h-9 text-sm border-gray-200 focus:ring-0 focus:outline-none">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getActiveModelNames().map((modelName: string) => {
                    const parts = modelName.split("/")
                    const displayName =
                      parts.length > 1
                        ? parts[1]
                            .split("-")
                            .map(
                              (word: string) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ")
                        : modelName
                    return (
                      <SelectItem key={modelName} value={modelName}>
                        {displayName}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            {selectedModelPricing && (
              <div className="pl-20 text-xs text-slate-600">
                <span>
                  Input {formatDollars(selectedModelPricing.input)}/1M
                </span>
                <span className="mx-2">•</span>
                <span>
                  Output {formatDollars(selectedModelPricing.output)}/1M
                </span>
              </div>
            )}

            {canSetHandOffType && (
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-700 w-20">Handoff</label>
                  <Select
                    value={data.handOffType || "sequential"}
                    onValueChange={(value) =>
                      setData((prev) => ({
                        ...prev,
                        handOffType:
                          value === "parallel"
                            ? ("parallel" as const)
                            : undefined,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full h-9 text-sm border-gray-200 focus:ring-0 focus:outline-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sequential">
                        Sequential (default)
                      </SelectItem>
                      <SelectItem value="parallel">
                        Parallel (fan-out)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-sm text-gray-700">Connections</label>
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
                  <div className="text-xs text-gray-500">
                    Connections are managed in the graph view
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Tools */}
          <div className="space-y-4 border-l pl-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-normal">Tools</h3>
            </div>

            <div className="space-y-6">
              {/* MCP tools */}
              <div className="space-y-2">
                <h4 className="text-sm text-gray-600">Web & API</h4>
                <div className="max-h-64 overflow-y-auto rounded-md border border-gray-200 divide-y">
                  {ACTIVE_MCP_TOOL_NAMES.map((tool) => {
                    const selected = data.mcpTools?.includes(tool)
                    const description =
                      ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION[tool] || ""
                    return (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => toggleMcpTool(tool)}
                        aria-pressed={selected}
                        className={`w-full text-left px-3 py-2 cursor-pointer transition-colors ${
                          selected
                            ? "bg-slate-50"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`mt-0.5 h-4 w-4 flex items-center justify-center rounded-sm border ${
                              selected
                                ? "bg-slate-600 border-slate-600"
                                : "bg-white border-gray-300"
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
                            <div className="text-sm font-medium text-slate-800">
                              {tool}
                            </div>
                            <div className="text-xs text-slate-600 line-clamp-2">
                              {description}
                            </div>
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
                  {ACTIVE_CODE_TOOL_NAMES.map((tool) => {
                    const selected = data.codeTools?.includes(tool)
                    const description =
                      ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION[tool] || ""
                    return (
                      <button
                        key={tool}
                        type="button"
                        onClick={() => toggleCodeTool(tool)}
                        aria-pressed={selected}
                        className={`w-full text-left px-3 py-2 cursor-pointer transition-colors ${
                          selected
                            ? "bg-slate-50"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className={`mt-0.5 h-4 w-4 flex items-center justify-center rounded-sm border ${
                              selected
                                ? "bg-slate-600 border-slate-600"
                                : "bg-white border-gray-300"
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
                            <div className="text-sm font-medium text-slate-800">
                              {tool}
                            </div>
                            <div className="text-xs text-slate-600 line-clamp-2">
                              {description}
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {data.status && data.status !== "initial" && (
              <div className="space-y-2">
                <h3 className="text-base font-normal">Status</h3>
                <div className="p-2.5 border border-gray-200 rounded">
                  <div className="text-sm capitalize">
                    {data.status || "ready"}
                  </div>
                  {data.messageCount !== undefined && data.messageCount > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      {data.messageCount} messages processed
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Changes are saved automatically
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
