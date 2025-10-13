"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/features/react-flow-visualization/components/ui/dialog"
import { Input } from "@/features/react-flow-visualization/components/ui/input"
import { Textarea } from "@/features/react-flow-visualization/components/ui/textarea"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Plug, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"

export interface ConnectorConfig {
  id: string
  name?: string
  description?: string
  type?: string
  config?: Record<string, unknown>
}

export interface ConnectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  connector: ConnectorConfig
  onSave?: (updates: ConnectorConfig) => void
  onDelete?: () => void
}

export function ConnectorDialog({ open, onOpenChange, connector, onSave, onDelete }: ConnectorDialogProps) {
  const [data, setData] = useState<ConnectorConfig>(connector)

  // Auto-save on user edits
  useEffect(() => {
    if (!onSave) return
    if (JSON.stringify(data) === JSON.stringify(connector)) return
    const timeoutId = setTimeout(() => {
      onSave(data)
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [data, connector, onSave])

  // Reset when connector changes
  useEffect(() => {
    setData(connector)
  }, [connector])

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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
              <Plug className="size-3" />
              Connector
            </span>
          </div>
          <VisuallyHidden>
            <DialogTitle>Connector settings</DialogTitle>
          </VisuallyHidden>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="connector-name" className="text-sm text-gray-700 font-medium">
              Name
            </label>
            <Input
              id="connector-name"
              value={data.name || ""}
              onChange={e =>
                setData(prev => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="My API Connector"
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="connector-type" className="text-sm text-gray-700 font-medium">
              Type
            </label>
            <Input
              id="connector-type"
              value={data.type || ""}
              onChange={e =>
                setData(prev => ({
                  ...prev,
                  type: e.target.value,
                }))
              }
              placeholder="API, Database, Webhook..."
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="connector-description" className="text-sm text-gray-700 font-medium">
              Description
            </label>
            <Textarea
              id="connector-description"
              value={data.description || ""}
              onChange={e =>
                setData(prev => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="What does this connector do?"
              className="min-h-[80px] resize-none text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="connector-config" className="text-sm text-gray-700 font-medium">
              Configuration <span className="text-gray-500 font-normal">(JSON)</span>
            </label>
            <Textarea
              id="connector-config"
              value={JSON.stringify(data.config || {}, null, 2)}
              onChange={e => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  setData(prev => ({
                    ...prev,
                    config: parsed,
                  }))
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              placeholder='{
  "url": "https://api.example.com",
  "apiKey": "..."
}'
              className="min-h-[120px] resize-none font-mono text-xs"
            />
          </div>
        </div>

        <div className="pt-4 border-t flex items-center justify-between">
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            <Trash2 className="size-4" />
            Delete connector
          </button>
          <p className="text-xs text-muted-foreground">Changes are saved automatically</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
