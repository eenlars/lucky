/**
 * AssistantMessage Component
 *
 * Displays assistant messages with left alignment and light styling
 */

"use client"

import type { ChatMessageProps } from "@/chat-interface/types"
import { ANIMATIONS } from "@/chat-interface/utils/animation-utils"
import { cn } from "@/lib/utils"
import { MessageActions } from "./MessageActions"
import { MessageContent } from "./MessageContent"
import { MessageTimestamp } from "./MessageTimestamp"

export function AssistantMessage({
  message,
  isLast: _isLast,
  showActions = true,
  showTimestamp = true,
  enableMarkdown = true,
  enableCodeHighlighting = true,
  onRetry,
  onCopy,
  onDelete,
  onFeedback,
}: ChatMessageProps) {
  const isStreaming = message.status === "streaming"

  return (
    <div id={message.id} className={cn("flex justify-start group", ANIMATIONS.messageEntry, "duration-500")}>
      <div className="flex flex-col items-start max-w-[90%] sm:max-w-[75%]">
        {/* Message bubble */}
        <div
          className={cn(
            "rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3",
            "bg-chat-accent text-chat-foreground border border-chat-border",
            "transition-all",
            isStreaming && "animate-pulse",
          )}
          style={{
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
            transitionDuration: "200ms",
          }}
        >
          <MessageContent
            content={message.content}
            enableMarkdown={enableMarkdown}
            enableCodeHighlighting={enableCodeHighlighting}
            className="text-sm font-light leading-relaxed"
          />
        </div>

        {/* Footer: timestamp and actions */}
        <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {showTimestamp && <MessageTimestamp timestamp={message.timestamp} className="text-xs text-chat-muted" />}

          {showActions && !isStreaming && (
            <MessageActions
              message={message}
              onCopy={onCopy}
              onRetry={onRetry}
              onDelete={onDelete}
              onFeedback={onFeedback}
              position="right"
            />
          )}
        </div>
      </div>
    </div>
  )
}
