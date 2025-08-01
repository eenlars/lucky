"use client"

import { useState } from "react"
import { Button } from "@/react-flow-visualization/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/react-flow-visualization/components/ui/dialog"
import { Textarea } from "@/react-flow-visualization/components/ui/textarea"

interface PromptInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onExecute: (prompt: string) => void
  loading?: boolean
}

export function PromptInputDialog({
  open,
  onOpenChange,
  onExecute,
  loading = false,
}: PromptInputDialogProps) {
  const [prompt, setPrompt] = useState("")

  console.log("PromptInputDialog render - open:", open)

  const handleExecute = () => {
    if (prompt.trim()) {
      onExecute(prompt.trim())
      setPrompt("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleExecute()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Run Workflow</DialogTitle>
          <DialogDescription>
            Enter a prompt to execute the workflow with. This will be used as
            the initial input for the workflow.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Enter your prompt here..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[120px] resize-none"
            disabled={loading}
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Press Cmd/Ctrl + Enter to execute
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleExecute} disabled={!prompt.trim() || loading}>
            {loading ? "Running..." : "Execute Workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
