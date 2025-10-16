/**
 * ChatInterface Component
 *
 * Minimal chat interface with clean message bubbles
 * Supports both simulation mode and real AI mode
 */

"use client"

import { cn } from "@/lib/utils"
import { useCallback, useState } from "react"
import { ChatInterfaceReal } from "./ChatInterfaceReal"
import { ChatInput } from "./components/ChatInput/ChatInput"
import { MessagesArea } from "./components/MessagesArea"
import { useChat } from "./hooks/useChat"
import type { ChatInterfaceProps } from "./types/types"

export function ChatInterface(props: ChatInterfaceProps) {
  const {
    initialMessages = [],
    placeholder = "Ask me anything about workflows...",
    onSendMessage,
    onMessageSent,
    onError,
    showTimestamps: _showTimestamps = true,
    enableMessageActions: _enableMessageActions = true,
    enableMarkdown: _enableMarkdown = false,
    enableCodeHighlighting: _enableCodeHighlighting = false,
    maxHeight,
    className,
    useSimulation = true,
    modelName,
    nodeId,
    systemPrompt: _systemPrompt,
  } = props

  // Use real AI mode with Provider pattern
  if (!useSimulation && modelName && nodeId) {
    return <ChatInterfaceReal {...props} />
  }

  // Simulation mode - use custom hook
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const {
    messages,
    isTyping,
    error,
    isLoading,
    sendMessage,
    retryMessage,
    deleteMessage: _deleteMessage,
  } = useChat({
    initialMessages,
    onSendMessage,
    onMessageReceived: onMessageSent,
    onError,
    useSimulation: true,
  })

  // Input state
  const [inputValue, setInputValue] = useState("")

  // Handle send
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const content = inputValue.trim()
    setInputValue("") // Clear input immediately

    await sendMessage(content)
  }, [inputValue, isLoading, sendMessage])

  return (
    <div className={cn("flex flex-col h-full w-full bg-white dark:bg-gray-950", className)} style={{ maxHeight }}>
      {/* Messages area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-3xl mx-auto">
          <MessagesArea
            messages={messages}
            isLoading={isLoading || isTyping}
            statusMessage={isTyping ? "Typing..." : null}
            error={error}
            onRetry={() => retryMessage(messages[messages.length - 1]?.id)}
          />
        </div>
      </div>

      {/* Input area */}
      <div className="bg-white dark:bg-gray-950">
        <div className="max-w-3xl mx-auto px-4 py-4">
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
