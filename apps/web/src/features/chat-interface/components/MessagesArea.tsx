"use client"

import { AnimatedStatusText } from "@/components/ui/animated-status-text"
import { cn } from "@/lib/utils"
import { ArrowDown } from "lucide-react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"

interface MessageBubbleProps {
  role: "user" | "assistant"
  content: string
}

function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user"

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[70%] px-3.5 py-2.5 rounded-lg text-sm",
          isUser
            ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
        )}
      >
        <div className="whitespace-pre-wrap leading-relaxed">{content}</div>
      </div>
    </div>
  )
}

interface SimpleMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
}

interface MessagesAreaProps {
  messages: SimpleMessage[]
  isLoading?: boolean
  statusMessage?: string | null
  error?: Error | null
  onRetry?: () => void
  emptyState?: React.ReactNode
  className?: string
}

/**
 * MessagesArea - Reusable minimal chat messages container
 *
 * Complete message display system with:
 * - Smart auto-scroll (StickToBottom)
 * - Empty state
 * - Message list with minimal bubbles
 * - Loading shimmer status
 * - Error display with retry
 * - Scroll-to-bottom FAB
 */
export function MessagesArea({
  messages,
  isLoading = false,
  statusMessage = null,
  error = null,
  onRetry,
  emptyState,
  className,
}: MessagesAreaProps) {
  return (
    <StickToBottom className={cn("flex-1 overflow-y-auto relative", className)} initial="smooth" resize="smooth">
      <StickToBottom.Content className="p-6">
        {messages.length === 0 ? (
          emptyState || (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-center space-y-2">
                <p className="text-sm">Start a conversation</p>
                <p className="text-xs">Type a message below to begin</p>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {messages
              .filter(message => {
                // Hide empty messages and system messages
                return message.role !== "system" && message.content && message.content.trim().length > 0
              })
              .map(message => (
                <MessageBubble key={message.id} role={message.role as "user" | "assistant"} content={message.content} />
              ))}

            {/* Shimmering status - no bubble, just status text */}
            {isLoading && statusMessage && (
              <div className="flex justify-start">
                <AnimatedStatusText text={statusMessage} shimmerDuration={1.5} variant="slide" className="text-xs" />
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div
                  id="chat-error"
                  role="alert"
                  className="max-w-[70%] px-3.5 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400"
                >
                  <p className="font-medium">Failed to send message</p>
                  <p className="text-xs mt-1">{error.message || "Something went wrong. Please try again."}</p>
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      aria-label="Retry sending message"
                      className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded text-xs font-medium transition-colors"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </StickToBottom.Content>

      {/* Scroll to bottom button */}
      <ScrollToBottomButton />
    </StickToBottom>
  )
}

// Scroll to bottom FAB button
function ScrollToBottomButton() {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext()

  if (isAtBottom) return null

  return (
    <button
      onClick={() => scrollToBottom()}
      className="absolute bottom-4 left-1/2 -translate-x-1/2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      aria-label="Scroll to bottom"
      type="button"
    >
      <ArrowDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
    </button>
  )
}
