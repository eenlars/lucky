"use client"

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
import {
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES,
  type CodeToolName,
  type MCPToolName,
} from "@core/tools/tool.types"
import type { ModelName } from "@core/workflow/schema/workflow.types"
import { pricing } from "@runtime/settings/models"
import { Edit2, Plus, Save, Trash2, X } from "lucide-react"
import React, { useState } from "react"

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
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editedData, setEditedData] = useState(nodeData)
  const [newTool, setNewTool] = useState({ mcp: "", code: "" })
  const [newHandoff, setNewHandoff] = useState("")
  const IconComponent = nodeData?.icon ? iconMapping[nodeData.icon] : undefined

  const handleSave = () => {
    if (onSave) {
      onSave(nodeData.nodeId, editedData)
    }
    setEditingSection(null)
  }

  const handleCancel = () => {
    setEditedData(nodeData)
    setEditingSection(null)
  }

  React.useEffect(() => {
    setEditedData(nodeData)
  }, [nodeData.nodeId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <div className="flex items-center gap-3">
            {IconComponent && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <IconComponent className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1">
              <DialogTitle>{nodeData.title || "Node Details"}</DialogTitle>
              <DialogDescription>
                {nodeData.label || nodeData.nodeId}
              </DialogDescription>
            </div>
            {editingSection && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  className="cursor-pointer"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="cursor-pointer"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex gap-8 h-full overflow-hidden">
          {/* Left Panel */}
          <div className="flex-1 space-y-6 overflow-y-auto pr-4">
            {/* Basic Information */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Node ID:</span>
                  <div className="font-mono">{nodeData.nodeId}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Model:</span>
                  {editingSection === "basic" ? (
                    <Select
                      value={editedData.modelName}
                      onValueChange={(value) =>
                        setEditedData({
                          ...editedData,
                          modelName: value as ModelName,
                        })
                      }
                    >
                      <SelectTrigger className="w-full mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(pricing) as ModelName[]).map(
                          (modelName) => {
                            const displayName = modelName
                              .split("/")[1]
                              .split("-")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(" ")
                            return (
                              <SelectItem key={modelName} value={modelName}>
                                {displayName}
                              </SelectItem>
                            )
                          }
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div>{nodeData.modelName}</div>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant={
                      nodeData.status === "success"
                        ? "default"
                        : nodeData.status === "error"
                          ? "destructive"
                          : nodeData.status === "loading"
                            ? "secondary"
                            : "outline"
                    }
                  >
                    {nodeData.status || "initial"}
                  </Badge>
                </div>
                {nodeData.messageCount !== undefined &&
                  nodeData.messageCount > 0 && (
                    <div>
                      <span className="text-muted-foreground">Messages:</span>
                      <div>{nodeData.messageCount}</div>
                    </div>
                  )}
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Description</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditingSection(
                      editingSection === "description" ? null : "description"
                    )
                  }
                  className="cursor-pointer hover:bg-muted"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
              {editingSection === "description" ? (
                <Textarea
                  value={editedData.description}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      description: e.target.value,
                    })
                  }
                  className="min-h-[100px]"
                  placeholder="Enter node description..."
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {nodeData.description || "No description provided"}
                </p>
              )}
            </div>

            <Separator />

            {/* System Prompt */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">System Prompt</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditingSection(
                      editingSection === "prompt" ? null : "prompt"
                    )
                  }
                  className="cursor-pointer hover:bg-muted"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
              {editingSection === "prompt" ? (
                <Textarea
                  value={editedData.systemPrompt}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      systemPrompt: e.target.value,
                    })
                  }
                  className="min-h-[200px] font-mono text-xs"
                  placeholder="Enter system prompt..."
                />
              ) : (
                <div className="bg-muted rounded-md p-4">
                  <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                    {nodeData.systemPrompt || "No system prompt provided"}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel */}
          <div className="flex-1 space-y-6 overflow-y-auto pl-4 border-l">
            {/* MCP Tools */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">MCP Tools</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditingSection(
                      editingSection === "mcptools" ? null : "mcptools"
                    )
                  }
                  className="cursor-pointer hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {editingSection === "mcptools" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {editedData.mcpTools?.map((tool, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-blue-50 border-blue-200 pr-1"
                      >
                        {tool}
                        <button
                          onClick={() => {
                            const newTools = [...editedData.mcpTools]
                            newTools.splice(index, 1)
                            setEditedData({ ...editedData, mcpTools: newTools })
                          }}
                          className="ml-2 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTool.mcp}
                      onChange={(e) =>
                        setNewTool({ ...newTool, mcp: e.target.value })
                      }
                      placeholder="Add MCP tool..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && newTool.mcp.trim()) {
                          e.preventDefault()
                          const toolName = newTool.mcp.trim()
                          if (
                            ACTIVE_MCP_TOOL_NAMES.includes(
                              toolName as MCPToolName
                            )
                          ) {
                            setEditedData({
                              ...editedData,
                              mcpTools: [
                                ...(editedData.mcpTools || []),
                                toolName as MCPToolName,
                              ],
                            })
                          }
                          setNewTool({ ...newTool, mcp: "" })
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (newTool.mcp.trim()) {
                          const toolName = newTool.mcp.trim()
                          if (
                            ACTIVE_MCP_TOOL_NAMES.includes(
                              toolName as MCPToolName
                            )
                          ) {
                            setEditedData({
                              ...editedData,
                              mcpTools: [
                                ...(editedData.mcpTools || []),
                                toolName as MCPToolName,
                              ],
                            })
                          }
                          setNewTool({ ...newTool, mcp: "" })
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {nodeData.mcpTools?.length > 0 ? (
                    nodeData.mcpTools.map((tool, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-blue-50 border-blue-200"
                      >
                        {tool}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No MCP tools configured
                    </span>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Code Tools */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Code Tools</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditingSection(
                      editingSection === "codetools" ? null : "codetools"
                    )
                  }
                  className="cursor-pointer hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {editingSection === "codetools" ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {editedData.codeTools?.map((tool, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-green-50 border-green-200 pr-1"
                      >
                        {tool}
                        <button
                          onClick={() => {
                            const newTools = [...editedData.codeTools]
                            newTools.splice(index, 1)
                            setEditedData({
                              ...editedData,
                              codeTools: newTools,
                            })
                          }}
                          className="ml-2 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newTool.code}
                      onChange={(e) =>
                        setNewTool({ ...newTool, code: e.target.value })
                      }
                      placeholder="Add code tool..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && newTool.code.trim()) {
                          e.preventDefault()
                          const toolName = newTool.code.trim()
                          if (
                            ACTIVE_CODE_TOOL_NAMES.includes(
                              toolName as CodeToolName
                            )
                          ) {
                            setEditedData({
                              ...editedData,
                              codeTools: [
                                ...(editedData.codeTools || []),
                                toolName as CodeToolName,
                              ],
                            })
                          }
                          setNewTool({ ...newTool, code: "" })
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (newTool.code.trim()) {
                          const toolName = newTool.code.trim()
                          if (
                            ACTIVE_CODE_TOOL_NAMES.includes(
                              toolName as CodeToolName
                            )
                          ) {
                            setEditedData({
                              ...editedData,
                              codeTools: [
                                ...(editedData.codeTools || []),
                                toolName as CodeToolName,
                              ],
                            })
                          }
                          setNewTool({ ...newTool, code: "" })
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {nodeData.codeTools?.length > 0 ? (
                    nodeData.codeTools.map((tool, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-green-50 border-green-200"
                      >
                        {tool}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No code tools configured
                    </span>
                  )}
                </div>
              )}
            </div>

            <Separator />

            {/* Hand-offs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Hand-offs</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEditingSection(
                      editingSection === "handoffs" ? null : "handoffs"
                    )
                  }
                  className="cursor-pointer hover:bg-muted"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              {editingSection === "handoffs" ? (
                <div className="space-y-3">
                  <ul className="space-y-2 text-sm">
                    {editedData.handOffs?.map((handoff, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                        <span className="flex-1">{handoff}</span>
                        <button
                          onClick={() => {
                            const newHandoffs = [...editedData.handOffs]
                            newHandoffs.splice(index, 1)
                            setEditedData({
                              ...editedData,
                              handOffs: newHandoffs,
                            })
                          }}
                          className="hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <Input
                      value={newHandoff}
                      onChange={(e) => setNewHandoff(e.target.value)}
                      placeholder="Add handoff node ID..."
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && newHandoff.trim()) {
                          e.preventDefault()
                          setEditedData({
                            ...editedData,
                            handOffs: [
                              ...(editedData.handOffs || []),
                              newHandoff.trim(),
                            ],
                          })
                          setNewHandoff("")
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (newHandoff.trim()) {
                          setEditedData({
                            ...editedData,
                            handOffs: [
                              ...(editedData.handOffs || []),
                              newHandoff.trim(),
                            ],
                          })
                          setNewHandoff("")
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <ul className="space-y-1 text-sm">
                  {nodeData.handOffs?.length > 0 ? (
                    nodeData.handOffs.map((handoff, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                        <span>{handoff}</span>
                      </li>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No handoffs configured
                    </span>
                  )}
                </ul>
              )}
            </div>

            {/* Memory */}
            {nodeData.memory && Object.keys(nodeData.memory).length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Memory</h4>
                  <div className="space-y-2">
                    {Object.entries(nodeData.memory).map(([key, value]) => (
                      <div key={key} className="bg-muted rounded-md p-3">
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                          {key}
                        </div>
                        <div className="text-sm">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
