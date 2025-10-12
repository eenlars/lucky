/**
 * MessageActions Component
 *
 * Action buttons for messages (copy, retry, delete, feedback)
 */

"use client"

import type { Message } from "@/chat-interface/types/types"
import { copyToClipboard } from "@/chat-interface/utils/message-utils"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Copy, RotateCw, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react"
import { useState } from "react"

interface MessageActionsProps {
  message: Message
  onRetry?: () => void
  onCopy?: () => void
  onDelete?: () => void
  onFeedback?: (feedback: "positive" | "negative") => void
  position?: "left" | "right"
}

export function MessageActions({
  message,
  onRetry,
  onCopy,
  onDelete,
  onFeedback,
  position = "left",
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState<"positive" | "negative" | null>(null)

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content)
    if (success) {
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFeedback = (type: "positive" | "negative") => {
    setFeedback(type)
    onFeedback?.(type)
  }

  const hasError = message.status === "error"

  return (
    <div className={cn("flex items-center gap-1", position === "right" ? "flex-row" : "flex-row-reverse")}>
      {/* Copy */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="h-6 w-6 hover:bg-black/5"
        title={copied ? "Copied!" : "Copy message"}
      >
        <Copy size={12} className={copied ? "text-green-600" : "text-black/40"} />
      </Button>

      {/* Retry (for errors or user messages) */}
      {(hasError || message.role === "user") && onRetry && (
        <Button variant="ghost" size="icon" onClick={onRetry} className="h-6 w-6 hover:bg-black/5" title="Retry">
          <RotateCw size={12} className="text-black/40" />
        </Button>
      )}

      {/* Feedback (for assistant messages only) */}
      {message.role === "assistant" && onFeedback && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleFeedback("positive")}
            className="h-6 w-6 hover:bg-black/5"
            title="Good response"
          >
            <ThumbsUp size={12} className={feedback === "positive" ? "text-green-600 fill-current" : "text-black/40"} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleFeedback("negative")}
            className="h-6 w-6 hover:bg-black/5"
            title="Poor response"
          >
            <ThumbsDown size={12} className={feedback === "negative" ? "text-red-600 fill-current" : "text-black/40"} />
          </Button>
        </>
      )}

      {/* Delete */}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-6 w-6 hover:bg-red-50 hover:text-red-600"
          title="Delete message"
        >
          <Trash2 size={12} className="text-black/40" />
        </Button>
      )}
    </div>
  )
}
