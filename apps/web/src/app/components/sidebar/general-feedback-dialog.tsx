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
import type { FeedbackContext } from "@lucky/shared/contracts/feedback"
import { Paperclip } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

type GeneralFeedbackDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GeneralFeedbackDialog({ open, onOpenChange }: GeneralFeedbackDialogProps) {
  const [feedbackText, setFeedbackText] = useState("")

  const handleFeedbackSubmit = useCallback(async () => {
    if (!feedbackText.trim()) {
      toast.error("Please enter your feedback")
      return
    }

    try {
      // Collect rich context for debugging
      const context: FeedbackContext = {
        url: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        userAgent: navigator.userAgent,
        screen: {
          width: window.screen.width,
          height: window.screen.height,
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timestamp: new Date().toISOString(),
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: feedbackText,
          context: JSON.stringify(context),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit feedback")
      }

      // Reset form and close dialog
      setFeedbackText("")
      onOpenChange(false)

      // Show success toast
      toast.success("Feedback submitted successfully!")
    } catch (error) {
      console.error("Failed to submit feedback:", error)
      toast.error("Failed to submit feedback. Please try again.")
    }
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
