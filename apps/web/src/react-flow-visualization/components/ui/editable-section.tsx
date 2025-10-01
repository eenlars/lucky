"use client"

import { Button } from "@/react-flow-visualization/components/ui/button"
import { Separator } from "@/react-flow-visualization/components/ui/separator"
import { Edit2, Plus, Save, X } from "lucide-react"
import React from "react"

interface EditableSectionProps {
  title: string
  sectionKey: string
  editingSection: string | null
  onEditingChange: (section: string | null) => void
  onSave: () => void
  onCancel: () => void
  editIcon?: "edit" | "plus"
  showSeparator?: boolean
  children: React.ReactNode
  editContent?: React.ReactNode
}

export function EditableSection({
  title,
  sectionKey,
  editingSection,
  onEditingChange,
  onSave,
  onCancel,
  editIcon = "edit",
  showSeparator = true,
  children,
  editContent,
}: EditableSectionProps) {
  const isEditing = editingSection === sectionKey
  const IconComponent = editIcon === "plus" ? Plus : Edit2

  const handleToggleEdit = () => {
    onEditingChange(isEditing ? null : sectionKey)
  }

  return (
    <>
      {showSeparator && <Separator />}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{title}</h4>
          <Button variant="ghost" size="sm" onClick={handleToggleEdit} className="cursor-pointer hover:bg-muted">
            <IconComponent className="h-3 w-3" />
          </Button>
        </div>

        {isEditing ? (
          <div className="space-y-3">
            {editContent}
            <div className="flex gap-2 pt-2">
              <Button variant="default" size="sm" onClick={onSave} className="cursor-pointer">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={onCancel} className="cursor-pointer">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          children
        )}
      </div>
    </>
  )
}
