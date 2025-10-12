"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/react-flow-visualization/components/ui/dialog"
import { Textarea } from "@/react-flow-visualization/components/ui/textarea"
import { Paperclip } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

type GeneralFeedbackDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GeneralFeedbackDialog({ open, onOpenChange }: GeneralFeedbackDialogProps) {
  const [feedbackText, setFeedbackText] = useState("")

  const handleFeedbackSubmit = useCallback(() => {
    if (!feedbackText.trim()) {
      toast.error("Please enter your feedback")
      return
    }

    // TODO: Implement actual feedback submission API
    console.log("Feedback submitted:", feedbackText)

    // Reset form and close dialog
    setFeedbackText("")
    onOpenChange(false)

    // Show success toast
    toast.success("Feedback submitted successfully!")
  }, [feedbackText, onOpenChange])

  // Handle keyboard shortcut ⌘↵ for submission
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        handleFeedbackSubmit()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, handleFeedbackSubmit])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Feedback</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-2">
            We read every message. A real human will respond. You can also reach us at hello@goalive.nl
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            placeholder="Tell us about your experience, bugs you've found, or features you'd like to see..."
            value={feedbackText}
            onChange={e => setFeedbackText(e.target.value)}
            className="min-h-[200px] resize-none"
          />

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => {
                // TODO: Implement image attachment functionality
                toast.info("Image attachment coming soon!")
              }}
            >
              <Paperclip className="w-4 h-4 mr-2" />
              Attach images
            </Button>

            <Button onClick={handleFeedbackSubmit} disabled={!feedbackText.trim()}>
              Send Feedback ⌘↵
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
