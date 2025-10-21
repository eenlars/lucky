"use client"

import { cn } from "@/lib/utils"
import type { UIMessage } from "@ai-sdk-tools/store"
import { useCallback, useState } from "react"
import { ChatInput } from "./components/ChatInput/ChatInput"
import { MessagesArea } from "./components/MessagesArea"
import { useChat } from "./hooks/useChat"
import { copyToClipboard } from "./utils/message-utils"

export interface ChatInterfaceProps {
  /** Initial messages to display */
  initialMessages?: UIMessage[]
  /** Placeholder text for input */
  placeholder?: string
  /** Callback when user sends a message */
  onSendMessage?: (content: string) => void | Promise<void>
  /** Callback when message is sent successfully */
  onMessageSent?: (message: UIMessage) => void
  /** Callback when error occurs */
  onError?: (error: Error) => void
  /** Custom suggested prompts */
  suggestions?: string[]
  /** Whether to show timestamps */
  showTimestamps?: boolean
  /** Whether to enable message actions (copy, retry, etc) */
  enableMessageActions?: boolean
  /** Whether to enable markdown rendering */
  enableMarkdown?: boolean
  /** Whether to enable code syntax highlighting */
  enableCodeHighlighting?: boolean
  /** Maximum height of the chat container */
  maxHeight?: string
  /** Custom className for container */
  className?: string
  /** Use simulated responses instead of real AI calls (default: true) */
  useSimulation?: boolean
  /** Model name for real AI calls (e.g., "openai/gpt-4") */
  gatewayModelId?: string
  /** Node ID for agent context (used in real mode) */
  nodeId?: string
  /** System prompt for the agent (used in real mode) */
  systemPrompt?: string
}

export function ChatInterfaceSimulation({
  initialMessages = [],
  placeholder = "Ask me anything about workflows...",
  onSendMessage,
  onMessageSent,
  onError,
  maxHeight,
  className,
}: ChatInterfaceProps) {
  const { messages, isTyping, error, isLoading, sendMessage, retryMessage, deleteMessage } = useChat({
    initialMessages,
    onSendMessage,
    onMessageReceived: onMessageSent,
    onError,
    useSimulation: true,
  })

  const [inputValue, setInputValue] = useState("")

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const content = inputValue.trim()
    setInputValue("")

    await sendMessage(content)
  }, [inputValue, isLoading, sendMessage])

  // Handle copy - Rams: honest, simple
  const handleCopy = useCallback(async (_id: string, content: string) => {
    await copyToClipboard(content)
  }, [])

  // Handle delete - Rams: minimal, functional
  const handleDelete = useCallback(
    (id: string) => {
      deleteMessage(id)
    },
    [deleteMessage],
  )

  return (
    <div className={cn("flex flex-col h-full w-full bg-white dark:bg-gray-950", className)} style={{ maxHeight }}>
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-3xl mx-auto">
          <MessagesArea
            messages={messages}
            isLoading={isLoading || isTyping}
            statusMessage={isTyping ? "Typing..." : null}
            error={error}
            onRetry={() => retryMessage(messages[messages.length - 1]?.id)}
            onCopy={handleCopy}
            onDelete={handleDelete}
          />
        </div>
      </div>

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
