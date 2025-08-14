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
import type { Metrics, FeedbackData } from "./types/evaluation"

type FeedbackDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  metrics: Metrics
  hasResults: boolean
  totalAchievedPoints: number
  totalMaxPoints: number
  workflowFeedback?: string | null
}

export default function FeedbackDialog({
  open,
  onOpenChange,
  taskId,
  metrics,
  hasResults,
  totalAchievedPoints,
  totalMaxPoints,
  workflowFeedback,
}: FeedbackDialogProps) {
  const [feedbackText, setFeedbackText] = useState("")
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null)

  const handleFeedbackSubmit = () => {
    const feedbackData: FeedbackData = {
      taskId,
      rating: feedbackRating,
      feedback: feedbackText,
      timestamp: new Date().toISOString(),
    }

    // Mock feedback submission
    console.log("Feedback submitted:", feedbackData)
    
    // Reset form and close dialog
    setFeedbackText("")
    setFeedbackRating(null)
    onOpenChange(false)
    
    // Could show a toast notification here
    alert("Feedback submitted successfully!")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Provide Feedback</DialogTitle>
          <DialogDescription>
            Share your thoughts on this workflow execution. Your feedback helps improve future performance.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Rating Section */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Overall Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => setFeedbackRating(rating)}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                    feedbackRating === rating
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-300 hover:border-blue-300"
                  }`}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          {/* Feedback Text */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Comments (optional)
            </label>
            <Textarea
              placeholder="What worked well? What could be improved? Any specific issues you noticed?"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Mock Analysis Section */}
          {hasResults && (
            <div className="border rounded-lg p-3 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Execution Summary</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div>Score: {metrics.score}% | Time: {metrics.time} | Cost: {metrics.cost}</div>
                <div>Criteria Achievement: {totalAchievedPoints}/{totalMaxPoints} points</div>
                <div className="text-gray-500 italic">
                  {metrics.output ? `Output: "${metrics.output.substring(0, 80)}..."` : "No output available"}
                </div>
              </div>
            </div>
          )}
          
          {/* Workflow Feedback Section */}
          {workflowFeedback && (
            <div className="border rounded-lg p-3 bg-blue-50">
              <h4 className="text-sm font-medium text-gray-700 mb-2">AI Evaluation Feedback</h4>
              <div className="text-xs text-gray-600 whitespace-pre-wrap">
                {workflowFeedback}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleFeedbackSubmit}
            disabled={feedbackRating === null}
          >
            Submit Feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}