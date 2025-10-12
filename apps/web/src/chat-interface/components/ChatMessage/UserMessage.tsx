/**
 * UserMessage Component
 *
 * Displays user messages with right alignment and distinctive styling
 */

"use client"

import type { ChatMessageProps } from "@/chat-interface/types/types"
import { ANIMATIONS } from "@/chat-interface/utils/animation-utils"
import { cn } from "@/lib/utils"
import { MessageActions } from "./MessageActions"
import { MessageContent } from "./MessageContent"
import { MessageTimestamp } from "./MessageTimestamp"

export function UserMessage({
  message,
  isLast: _isLast,
  showActions = false,
  showTimestamp = true,
  enableMarkdown = false,
  onRetry,
  onCopy,
  onDelete,
}: ChatMessageProps) {
  const hasError = message.status === "error"
  const isSending = message.status === "sending"

  return (
    <div id={message.id} className={cn("flex justify-end group", ANIMATIONS.messageEntry, "duration-500")}>
      <div className="flex flex-col items-end max-w-[90%] sm:max-w-[75%]">
        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3",
            "transition-all",
            hasError ? "bg-red-500 text-white" : "bg-chat-primary text-white",
            isSending && "opacity-70",
          )}
          style={{
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
            transitionDuration: "200ms",
          }}
        >
          <MessageContent
            content={message.content}
            enableMarkdown={enableMarkdown}
            className="text-sm font-light leading-relaxed"
          />
        </div>

        {/* Footer: timestamp and actions */}
        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {showTimestamp && <MessageTimestamp timestamp={message.timestamp} className="text-xs text-chat-muted" />}

          {showActions && (
            <MessageActions message={message} onRetry={onRetry} onCopy={onCopy} onDelete={onDelete} position="left" />
          )}
        </div>

        {/* Error indicator */}
        {hasError && (
          <button
            onClick={onRetry}
            className="text-xs text-red-500 hover:text-red-600 mt-2 cursor-pointer transition-colors"
            type="button"
          >
            Failed to send • Click to retry
          </button>
        )}
      </div>
    </div>
  )
}
