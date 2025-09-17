"use client"

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
import { useState } from "react"

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
  logs = [],
}: PromptInputDialogProps & { logs?: string[] }) {
  const [prompt, setPrompt] = useState("")

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

  const isExecuting = loading || logs.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px]"
        data-testid="prompt-input-dialog"
      >
        <DialogHeader>
          <DialogTitle>
            {isExecuting ? "Workflow Execution" : "Run Workflow"}
          </DialogTitle>
          <DialogDescription>
            {loading
              ? "Workflow is running. Please wait for completion."
              : logs.length > 0
                ? "Workflow execution completed. You can view the results below."
                : "Enter a prompt to execute the workflow with. This will be used as the initial input for the workflow."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!isExecuting && (
            <>
              <Textarea
                placeholder="Enter your prompt here..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[120px] resize-none"
                disabled={loading}
                autoFocus
                data-testid="prompt-input-textarea"
              />
              <p className="text-xs text-muted-foreground">
                Press Cmd/Ctrl + Enter to execute
              </p>
            </>
          )}
          {logs.length > 0 && (
            <div className="max-h-60 overflow-auto rounded border p-2 text-xs font-mono bg-muted/30">
              {logs.map((m, i) => (
                <p key={i} className="break-words">
                  {m}
                </p>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            data-testid="prompt-dialog-cancel-button"
          >
            {logs.length > 0 && !loading ? "Close" : "Cancel"}
          </Button>
          {!isExecuting && (
            <Button
              onClick={handleExecute}
              disabled={!prompt.trim() || loading}
              data-testid="execute-workflow-button"
            >
              Execute Workflow
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
