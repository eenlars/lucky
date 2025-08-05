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
import { ModelName, pricing } from "@runtime/settings/models"
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
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(nodeData)
  const [newTool, setNewTool] = useState({ mcp: "", code: "" })
  const [newHandoff, setNewHandoff] = useState("")
  const IconComponent = nodeData?.icon ? iconMapping[nodeData.icon] : undefined

  const handleSave = () => {
    if (onSave) {
      onSave(nodeData.nodeId, editedData)
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedData(nodeData)
    setIsEditing(false)
  }

  // Reset edited data when node changes
  React.useEffect(() => {
    setEditedData(nodeData)
  }, [nodeData.nodeId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {IconComponent && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <IconComponent className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    value={editedData.title || ""}
                    onChange={(e) =>
                      setEditedData({ ...editedData, title: e.target.value })
                    }
                    placeholder="Node title"
                    className="text-lg font-semibold"
                  />
                  <Input
                    value={editedData.label || ""}
                    onChange={(e) =>
                      setEditedData({ ...editedData, label: e.target.value })
                    }
                    placeholder="Node label"
                    className="text-sm text-muted-foreground"
                  />
                </div>
              ) : (
                <>
                  <DialogTitle>{nodeData.title || "Node Details"}</DialogTitle>
                  <DialogDescription>
                    {nodeData.label || nodeData.nodeId}
                  </DialogDescription>
                </>
              )}
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button variant="default" size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Node ID:</span>
                <div className="font-mono">{nodeData.nodeId}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Model:</span>
                {isEditing ? (
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
              {nodeData.messageCount !== undefined && (
                <div>
                  <span className="text-muted-foreground">Messages:</span>
                  <div>{nodeData.messageCount}</div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Description</h4>
              {isEditing ? (
                <Textarea
                  value={editedData.description}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      description: e.target.value,
                    })
                  }
                  className="min-h-[80px]"
                  placeholder="Enter node description..."
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {nodeData.description || "No description provided"}
                </p>
              )}
            </div>
          </>

          {/* System Prompt */}
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">System Prompt</h4>
              {isEditing ? (
                <Textarea
                  value={editedData.systemPrompt}
                  onChange={(e) =>
                    setEditedData({
                      ...editedData,
                      systemPrompt: e.target.value,
                    })
                  }
                  className="min-h-[120px] font-mono text-xs"
                  placeholder="Enter system prompt..."
                />
              ) : (
                <div className="bg-muted rounded-md p-3">
                  <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                    {nodeData.systemPrompt || "No system prompt provided"}
                  </pre>
                </div>
              )}
            </div>
          </>

          {/* MCP Tools */}
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">MCP Tools</h4>
              {isEditing ? (
                <div className="space-y-2">
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
          </>

          {/* Code Tools */}
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Code Tools</h4>
              {isEditing ? (
                <div className="space-y-2">
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
          </>

          {/* Hand-offs */}
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Hand-offs</h4>
              {isEditing ? (
                <div className="space-y-2">
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
          </>

          {/* Memory */}
          {nodeData.memory && Object.keys(nodeData.memory).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
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
      </DialogContent>
    </Dialog>
  )
}
