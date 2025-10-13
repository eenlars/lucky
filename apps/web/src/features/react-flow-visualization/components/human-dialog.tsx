"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/features/react-flow-visualization/components/ui/dialog"
import { Textarea } from "@/features/react-flow-visualization/components/ui/textarea"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Trash2, User } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

export interface HumanGateConfig {
  id: string
  prompt?: string
  instructions?: string
}

export interface HumanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: HumanGateConfig
  onSave?: (updates: HumanGateConfig) => void
  onDelete?: () => void
}

export function HumanDialog({ open, onOpenChange, config, onSave, onDelete }: HumanDialogProps) {
  const [data, setData] = useState<HumanGateConfig>(config)

  // Auto-save on user edits
  useEffect(() => {
    if (!onSave) return
    if (JSON.stringify(data) === JSON.stringify(config)) return
    const timeoutId = setTimeout(() => {
      onSave(data)
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [data, config, onSave])

  // Reset when config changes
  useEffect(() => {
    setData(config)
  }, [config])

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete()
      onOpenChange(false)
    }
  }, [onDelete, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="pb-4">
          <div className="flex justify-center -mt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100 px-3 py-1 text-xs font-medium text-amber-700 shadow-sm">
              <User className="size-3" />
              Human Gate
            </span>
          </div>
          <VisuallyHidden>
            <DialogTitle>Human gate settings</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="human-prompt" className="text-sm text-gray-700 font-medium">
              Review Instructions
            </label>
            <Textarea
              id="human-prompt"
              value={data.prompt || ""}
              onChange={e =>
                setData(prev => ({
                  ...prev,
                  prompt: e.target.value,
                }))
              }
              placeholder="What should the human review?"
              className="min-h-[100px] resize-none text-sm"
            />
            <p className="text-xs text-gray-500">
              These instructions will be shown to the human reviewer when the workflow reaches this gate.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="human-instructions" className="text-sm text-gray-700 font-medium">
              Additional Context
            </label>
            <Textarea
              id="human-instructions"
              value={data.instructions || ""}
              onChange={e =>
                setData(prev => ({
                  ...prev,
                  instructions: e.target.value,
                }))
              }
              placeholder="Any additional context or guidelines for the reviewer..."
              className="min-h-[80px] resize-none text-sm"
            />
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h4 className="text-sm font-medium text-amber-900 mb-2">How it works</h4>
            <ul className="text-xs text-amber-800 space-y-1.5 list-disc list-inside">
              <li>Workflow pauses when agent completes</li>
              <li>Human reviews the output</li>
              <li>
                <strong>Approve</strong> → workflow continues to next node
              </li>
              <li>
                <strong>Reject</strong> → provide new instructions and agent retries
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="size-4" />
            Remove gate
          </button>
          <p className="text-xs text-muted-foreground">Changes are saved automatically</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
