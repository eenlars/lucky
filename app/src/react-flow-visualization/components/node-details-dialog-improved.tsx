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
import { EditableSection } from "@/react-flow-visualization/components/ui/editable-section"
import { iconMapping } from "@/react-flow-visualization/components/ui/icon-mapping"
import { Input } from "@/react-flow-visualization/components/ui/input"
import { Textarea } from "@/react-flow-visualization/components/ui/textarea"
import { ToolManager } from "@/react-flow-visualization/components/ui/tool-manager"
import {
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES,
  type CodeToolName,
  type MCPToolName,
} from "@core/tools/tool.types"
import { Plus, Trash2 } from "lucide-react"
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
    setNewHandoff("")
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
                  <div>{nodeData.modelName}</div>
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

            <EditableSection
              title="Description"
              sectionKey="description"
              editingSection={editingSection}
              onEditingChange={setEditingSection}
              onSave={handleSave}
              onCancel={handleCancel}
              editContent={
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
              }
            >
              <p className="text-sm text-muted-foreground">
                {nodeData.description || "No description provided"}
              </p>
            </EditableSection>

            <EditableSection
              title="System Prompt"
              sectionKey="prompt"
              editingSection={editingSection}
              onEditingChange={setEditingSection}
              onSave={handleSave}
              onCancel={handleCancel}
              editContent={
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
              }
            >
              <div className="bg-muted rounded-md p-4">
                <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                  {nodeData.systemPrompt || "No system prompt provided"}
                </pre>
              </div>
            </EditableSection>
          </div>

          {/* Right Panel */}
          <div className="flex-1 space-y-6 overflow-y-auto pl-4 border-l">
            <EditableSection
              title="MCP Tools"
              sectionKey="mcptools"
              editingSection={editingSection}
              onEditingChange={setEditingSection}
              onSave={handleSave}
              onCancel={handleCancel}
              editIcon="plus"
              showSeparator={false}
              editContent={
                <ToolManager
                  tools={editedData.mcpTools || []}
                  onToolsChange={(tools) =>
                    setEditedData({
                      ...editedData,
                      mcpTools: tools as MCPToolName[],
                    })
                  }
                  placeholder="Add MCP tool..."
                  validTools={ACTIVE_MCP_TOOL_NAMES}
                  badgeClassName="bg-blue-50 border-blue-200"
                  emptyMessage="No MCP tools configured"
                />
              }
            >
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
            </EditableSection>

            <EditableSection
              title="Code Tools"
              sectionKey="codetools"
              editingSection={editingSection}
              onEditingChange={setEditingSection}
              onSave={handleSave}
              onCancel={handleCancel}
              editIcon="plus"
              editContent={
                <ToolManager
                  tools={editedData.codeTools || []}
                  onToolsChange={(tools) =>
                    setEditedData({
                      ...editedData,
                      codeTools: tools as CodeToolName[],
                    })
                  }
                  placeholder="Add code tool..."
                  validTools={ACTIVE_CODE_TOOL_NAMES}
                  badgeClassName="bg-green-50 border-green-200"
                  emptyMessage="No code tools configured"
                />
              }
            >
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
            </EditableSection>

            <EditableSection
              title="Hand-offs"
              sectionKey="handoffs"
              editingSection={editingSection}
              onEditingChange={setEditingSection}
              onSave={handleSave}
              onCancel={handleCancel}
              editIcon="plus"
              editContent={
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
                          className="hover:text-destructive cursor-pointer"
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
                      className="cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              }
            >
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
            </EditableSection>

            {/* Memory */}
            {nodeData.memory && Object.keys(nodeData.memory).length > 0 && (
              <EditableSection
                title="Memory"
                sectionKey="memory"
                editingSection={editingSection}
                onEditingChange={setEditingSection}
                onSave={handleSave}
                onCancel={handleCancel}
                editContent={<div>Memory editing not implemented</div>}
              >
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
              </EditableSection>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
