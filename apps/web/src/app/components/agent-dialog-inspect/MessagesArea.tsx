"use client"

import { AnimatedStatusText } from "@/components/ui/animated-status-text"
import { ArrowDown } from "lucide-react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"
import { MessageBubble } from "./MessageBubble"

interface MessagePart {
  type: string
  text: string
}

interface Message {
  id: string
  role: "user" | "assistant"
  parts: MessagePart[]
}

interface MessagesAreaProps {
  messages: Message[]
  isLoading?: boolean
  statusMessage?: string | null
  error?: Error | null
  onRetry?: () => void
  emptyState?: React.ReactNode
}

/**
 * MessagesArea - Reusable chat messages container
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
}: MessagesAreaProps) {
  return (
    <StickToBottom className="flex-1 overflow-y-auto relative" initial="smooth" resize="smooth">
      <StickToBottom.Content className="p-6">
        {messages.length === 0 ? (
          emptyState || (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-center space-y-2">
                <p className="text-sm">Test your agent by asking questions</p>
                <p className="text-xs">Type a message below to start</p>
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            {messages
              .filter(message => {
                // Hide empty assistant messages during streaming
                if (message.role === "assistant") {
                  const hasText = message.parts.some(part => part.type === "text" && part.text.trim())
                  return hasText
                }
                return true
              })
              .map(message => {
                // Extract text content from message parts
                const content = message.parts
                  .filter(part => part.type === "text")
                  .map(part => part.text)
                  .join("")

                return <MessageBubble key={message.id} role={message.role} content={content} />
              })}

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
