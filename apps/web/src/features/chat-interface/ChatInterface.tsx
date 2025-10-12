/**
 * ChatInterface Component
 *
 * The Cathedral - Main orchestrator that brings all components together
 * Inspired by Gaudí's Sagrada Família - organic, flowing, purposeful
 */

"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useCallback, useState } from "react"
import { ChatInput } from "./components/ChatInput/ChatInput"
import { ChatMessage } from "./components/ChatMessage/ChatMessage"
import { TypingIndicator } from "./components/TypingIndicator/TypingIndicator"
import { useAutoScroll } from "./hooks/useAutoScroll"
import { useChat } from "./hooks/useChat"
import { COMMON_SHORTCUTS, useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts"
import type { ChatInterfaceProps } from "./types/types"

export function ChatInterface({
  initialMessages = [],
  placeholder = "Ask me anything about workflows...",
  onSendMessage,
  onMessageSent,
  onError,
  showTimestamps = true,
  enableMessageActions = true,
  enableMarkdown = false,
  enableCodeHighlighting = false,
  maxHeight,
  className,
}: ChatInterfaceProps) {
  // Chat state
  const { messages, isTyping, error, isLoading, sendMessage, retryMessage, deleteMessage } = useChat({
    initialMessages,
    onSendMessage,
    onMessageReceived: onMessageSent,
    onError,
  })

  // Input state
  const [inputValue, setInputValue] = useState("")

  // Auto-scroll
  const { scrollRef, scrollToBottom } = useAutoScroll([messages, isTyping], {
    enabled: true,
    smooth: true,
  })

  // Handle send
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const content = inputValue.trim()
    setInputValue("") // Clear input immediately

    await sendMessage(content)
  }, [inputValue, isLoading, sendMessage])

  // Handle retry
  const handleRetry = useCallback(
    (messageId: string) => {
      retryMessage(messageId)
    },
    [retryMessage],
  )

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    shortcuts: [
      COMMON_SHORTCUTS.focusInput(() => {
        const input = document.querySelector("textarea[data-chat-input]") as HTMLTextAreaElement
        input?.focus()
      }),
      COMMON_SHORTCUTS.scrollToBottom(scrollToBottom),
    ],
  })

  return (
    <div className={cn("flex flex-col h-full w-full bg-chat-background", className)} style={{ maxHeight }}>
      {/* Messages area */}
      <ScrollArea
        ref={scrollRef}
        className="flex-1 px-3 pt-8 pb-4 sm:px-4 sm:py-6 overflow-auto [-webkit-overflow-scrolling:touch]"
      >
        <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
          {/* Messages */}
          {messages.map((message, idx) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLast={idx === messages.length - 1}
              showActions={enableMessageActions}
              showTimestamp={showTimestamps}
              enableMarkdown={enableMarkdown}
              enableCodeHighlighting={enableCodeHighlighting}
              onRetry={() => handleRetry(message.id)}
              onDelete={() => deleteMessage(message.id)}
            />
          ))}

          {/* Typing indicator */}
          {isTyping && <TypingIndicator />}

          {/* Error display */}
          {error && (
            <div
              className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 transition-all"
              style={{
                transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                transitionDuration: "200ms",
              }}
            >
              {error.message}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="bg-chat-background">
        <div className="max-w-3xl mx-auto px-3 py-3 sm:px-4 sm:py-4">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            placeholder={placeholder}
            disabled={isLoading}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  )
}
