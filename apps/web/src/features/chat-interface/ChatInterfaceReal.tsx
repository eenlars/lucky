/**
 * ChatInterfaceReal Component
 *
 * Real AI chat using @ai-sdk-tools/store with Provider
 */

"use client"

import { cn } from "@/lib/utils"
import { Provider, useChat, useChatActions } from "@ai-sdk-tools/store"
import { DefaultChatTransport } from "ai"
import { useCallback, useEffect, useRef, useState } from "react"
import { ChatInput } from "./components/ChatInput/ChatInput"
import type { ChatInterfaceProps } from "./ChatInterfaceSimulation"
import { EmptyResponseError } from "./components/EmptyResponseError"
import { MessagesArea } from "./components/MessagesArea"
import { copyToClipboard } from "./utils/message-utils"
import { getMessageText } from "./utils/message-utils"

interface ChatInterfaceRealInnerProps extends ChatInterfaceProps {
  nodeId: string
  modelName: string
  systemPrompt?: string
}

function ChatInterfaceRealInner({
  placeholder = "Ask me anything about workflows...",
  onSendMessage,
  onMessageSent,
  onError,
  maxHeight,
  className,
  nodeId,
  modelName,
  systemPrompt,
}: ChatInterfaceRealInnerProps) {
  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agent/chat",
      body: {
        nodeId,
        modelName,
        systemPrompt,
      },
    }),
  })
  const { setMessages } = useChatActions()
  const [inputValue, setInputValue] = useState("")
  const previousMessagesLengthRef = useRef(0)

  const isLoading = status === "submitted" || status === "streaming"

  // Check if last message is empty assistant response
  const lastMessage = messages[messages.length - 1]
  const showEmptyResponseWarning =
    !isLoading &&
    lastMessage &&
    lastMessage.role === "assistant" &&
    getMessageText(lastMessage).trim().length === 0

  // Notify parent when new assistant messages arrive
  useEffect(() => {
    if (messages.length > previousMessagesLengthRef.current) {
      const newMessages = messages.slice(previousMessagesLengthRef.current)
      const newAssistantMessages = newMessages.filter(msg => msg.role === "assistant")

      if (newAssistantMessages.length > 0 && onMessageSent) {
        // Notify for the latest assistant message
        onMessageSent(newAssistantMessages[newAssistantMessages.length - 1])
      }

      previousMessagesLengthRef.current = messages.length
    }
  }, [messages, onMessageSent])

  // Notify parent when errors occur
  useEffect(() => {
    if (error && onError) {
      onError(error instanceof Error ? error : new Error(String(error)))
    }
  }, [error, onError])

  // Handle send
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return

    const content = inputValue.trim()
    setInputValue("") // Clear input immediately

    if (onSendMessage) {
      await onSendMessage(content)
    }

    sendMessage({ text: content })
  }, [inputValue, isLoading, sendMessage, onSendMessage])

  // Handle retry - resend the last user message
  const handleRetry = useCallback(() => {
    // Find the last user message
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === "user")

    if (lastUserMessage) {
      sendMessage({ text: getMessageText(lastUserMessage) })
    }
  }, [messages, sendMessage])

  // Handle copy - Rams: honest, simple
  const handleCopy = useCallback(async (_id: string, content: string) => {
    await copyToClipboard(content)
  }, [])

  // Handle delete - Rams: minimal, functional
  const handleDelete = useCallback(
    (id: string) => {
      setMessages(messages.filter(msg => msg.id !== id))
    },
    [messages, setMessages],
  )

  return (
    <div className={cn("flex flex-col h-full w-full bg-white dark:bg-gray-950", className)} style={{ maxHeight }}>
      {/* Messages area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-3xl mx-auto px-4">
          <MessagesArea
            messages={messages}
            isLoading={isLoading}
            statusMessage={isLoading ? "Thinking..." : null}
            error={error instanceof Error ? error : error ? new Error(String(error)) : null}
            onRetry={handleRetry}
            onCopy={handleCopy}
            onDelete={handleDelete}
          />

          {/* Empty response warning - show inline after messages */}
          {showEmptyResponseWarning && (
            <div className="py-4">
              <EmptyResponseError modelName={modelName} />
            </div>
          )}
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

export function ChatInterfaceReal({
  nodeId = "default-node",
  modelName = "openai#gpt-5-nano",
  systemPrompt,
  ...props
}: ChatInterfaceProps) {
  return (
    <Provider initialMessages={props.initialMessages || []}>
      <ChatInterfaceRealInner {...props} nodeId={nodeId} modelName={modelName} systemPrompt={systemPrompt} />
    </Provider>
  )
}
