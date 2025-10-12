"use client"

import { Badge } from "@/features/react-flow-visualization/components/ui/badge"
import { Button } from "@/features/react-flow-visualization/components/ui/button"
import { Input } from "@/features/react-flow-visualization/components/ui/input"
import { Plus, Trash2 } from "lucide-react"
import type React from "react"
import { useState } from "react"

interface ToolManagerProps {
  tools: string[]
  onToolsChange: (tools: string[]) => void
  placeholder: string
  validTools: readonly string[]
  badgeClassName?: string
  emptyMessage: string
}

export function ToolManager({
  tools,
  onToolsChange,
  placeholder,
  validTools,
  badgeClassName = "bg-blue-50 border-blue-200",
  emptyMessage,
}: ToolManagerProps) {
  const [newTool, setNewTool] = useState("")

  const addTool = () => {
    if (newTool.trim() && validTools.includes(newTool.trim())) {
      onToolsChange([...tools, newTool.trim()])
      setNewTool("")
    }
  }

  const removeTool = (index: number) => {
    const newTools = [...tools]
    newTools.splice(index, 1)
    onToolsChange(newTools)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTool()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tools.map((tool, index) => (
          <Badge key={index} variant="outline" className={`${badgeClassName} pr-1`}>
            {tool}
            <button
              type="button"
              onClick={() => removeTool(index)}
              className="ml-2 hover:text-destructive cursor-pointer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={newTool}
          onChange={e => setNewTool(e.target.value)}
          placeholder={placeholder}
          onKeyPress={handleKeyPress}
        />
        <Button size="sm" variant="outline" onClick={addTool} className="cursor-pointer">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {tools.length === 0 && <span className="text-sm text-muted-foreground">{emptyMessage}</span>}
    </div>
  )
}
