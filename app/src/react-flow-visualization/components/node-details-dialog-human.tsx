"use client"

import {
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES,
  type CodeToolName,
  type MCPToolName,
} from "@/core/tools/tool.types"
import { WorkflowNodeData } from "@/react-flow-visualization/components/nodes"
import { Badge } from "@/react-flow-visualization/components/ui/badge"
import { Button } from "@/react-flow-visualization/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/react-flow-visualization/components/ui/dialog"
import { iconMapping } from "@/react-flow-visualization/components/ui/icon-mapping"
import { Input } from "@/react-flow-visualization/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-flow-visualization/components/ui/select"
import { Separator } from "@/react-flow-visualization/components/ui/separator"
import { Textarea } from "@/react-flow-visualization/components/ui/textarea"
import { ModelName, pricing } from "@/runtime/settings/models"
import { Plus, X } from "lucide-react"
import React, { useEffect, useState } from "react"

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
  const [newHandoff, setNewHandoff] = useState("")
  const IconComponent = nodeData?.icon ? iconMapping[nodeData.icon] : undefined

  // Auto-save on any change
  useEffect(() => {
    if (onSave && JSON.stringify(data) !== JSON.stringify(nodeData)) {
      const timeoutId = setTimeout(() => {
        onSave(nodeData.nodeId, data)
      }, 500) // Debounce 500ms
      return () => clearTimeout(timeoutId)
    }
  }, [data, nodeData, onSave])

  // Reset when node changes
  useEffect(() => {
    setData(nodeData)
  }, [nodeData.nodeId])

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

  const addHandoff = () => {
    if (newHandoff.trim()) {
      setData((prev) => ({
        ...prev,
        handOffs: [...(prev.handOffs || []), newHandoff.trim()],
      }))
      setNewHandoff("")
    }
  }

  const removeHandoff = (index: number) => {
    setData((prev) => ({
      ...prev,
      handOffs: prev.handOffs?.filter((_, i) => i !== index) || [],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden">
        <DialogHeader className="pb-6">
          <div className="flex items-center gap-4">
            {IconComponent && (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
                <IconComponent className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <DialogTitle className="text-xl">
                {nodeData.title || "Node Configuration"}
              </DialogTitle>
              <DialogDescription className="text-base">
                Configure how this node behaves and what tools it can use
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex gap-16 h-full overflow-hidden">
          {/* Left: Core Configuration */}
          <div className="flex-1 space-y-12">
            <div className="space-y-8">
              <div className="space-y-3">
                <h3 className="text-base font-normal">Description</h3>
                <Textarea
                  value={data.description || ""}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="What should this node do?"
                  className="min-h-[80px] resize-none border-gray-200 text-sm leading-relaxed px-4 py-4 focus-visible:ring-offset-2"
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-normal">Instructions</h3>
                <Textarea
                  value={data.systemPrompt || ""}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      systemPrompt: e.target.value,
                    }))
                  }
                  placeholder="How should it accomplish this?"
                  className="min-h-[160px] resize-none border-gray-200 text-sm leading-relaxed px-4 py-4 focus-visible:ring-offset-2"
                />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-base font-normal">Connections</h3>
              <div className="space-y-2">
                {data.handOffs?.map((handoff, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded text-sm text-gray-500"
                  >
                    <span className="font-mono">{handoff}</span>
                  </div>
                ))}
                {(!data.handOffs || data.handOffs.length === 0) && (
                  <div className="p-3 border border-gray-200 rounded text-sm text-gray-500">
                    Connections are managed in the graph view
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Tools */}
          <div className="flex-1 space-y-8 border-l pl-16">
            <div className="space-y-6">
              <h3 className="text-base font-normal">Tools</h3>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-sm text-gray-600">Web & API</h4>
                  <div className="space-y-3">
                    {/* Selected tools as pills */}
                    {data.mcpTools && data.mcpTools.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {data.mcpTools.map((tool, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-green-50 text-green-800 border border-green-100 hover:bg-green-100 cursor-pointer"
                            onClick={() => removeMcpTool(index)}
                          >
                            {tool}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Available tools as buttons */}
                    <div className="flex flex-wrap gap-2">
                      {ACTIVE_MCP_TOOL_NAMES.filter(
                        (tool) => !data.mcpTools?.includes(tool)
                      ).map((tool) => (
                        <Button
                          key={tool}
                          variant="ghost"
                          size="sm"
                          onClick={() => addMcpTool(tool)}
                          className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 h-6 px-2 cursor-pointer"
                        >
                          {tool}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm text-gray-600">Code & Files</h4>
                  <div className="space-y-3">
                    {/* Selected tools as pills */}
                    {data.codeTools && data.codeTools.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {data.codeTools.map((tool, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-green-50 text-green-800 border border-green-100 hover:bg-green-100 cursor-pointer"
                            onClick={() => removeCodeTool(index)}
                          >
                            {tool}
                            <X className="h-3 w-3 ml-1" />
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Available tools as buttons */}
                    <div className="flex flex-wrap gap-2">
                      {ACTIVE_CODE_TOOL_NAMES.filter(
                        (tool) => !data.codeTools?.includes(tool)
                      ).map((tool) => (
                        <Button
                          key={tool}
                          variant="ghost"
                          size="sm"
                          onClick={() => addCodeTool(tool)}
                          className="text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 h-6 px-2 cursor-pointer"
                        >
                          {tool}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {data.status && data.status !== "initial" && (
              <div className="space-y-3">
                <h3 className="text-base font-normal">Status</h3>
                <div className="p-3 border border-gray-200 rounded">
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

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Changes are saved automatically
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
