/**
 * useChat Hook
 *
 * Main chat state management hook
 * Handles messages, sending, streaming, and error states
 */

import { useCallback, useRef, useState } from "react"
import type { ChatActions, ChatState, Message, MessageRole, StreamingMessage } from "../types/types"
import { createMessage } from "../utils/message-utils"

export interface UseChatOptions {
  /** Initial messages */
  initialMessages?: Message[]
  /** Callback when message is sent */
  onSendMessage?: (content: string) => void | Promise<void>
  /** Callback when message is received */
  onMessageReceived?: (message: Message) => void
  /** Callback when error occurs */
  onError?: (error: Error) => void
  /** Enable streaming responses */
  enableStreaming?: boolean
  /** Maximum number of messages to keep */
  maxMessages?: number
}

export interface UseChatReturn extends ChatState, ChatActions {
  /** Whether any operation is in progress */
  isLoading: boolean
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const {
    initialMessages = [],
    onSendMessage,
    onMessageReceived,
    onError,
    enableStreaming = false,
    maxMessages = 1000,
  } = options

  // State
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [isTyping, setIsTyping] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<StreamingMessage | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Refs
  const _abortControllerRef = useRef<AbortController | null>(null)

  // ============================================================================
  // Actions
  // ============================================================================

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return

      const userMessage = createMessage(content, "user", {
        status: "sending",
      })

      // Add user message
      setMessages(prev => [...prev, userMessage])
      setError(null)
      setIsLoading(true)

      try {
        // Update status to sent
        setMessages(prev => prev.map(msg => (msg.id === userMessage.id ? { ...msg, status: "sent" as const } : msg)))

        // Call callback
        if (onSendMessage) {
          await onSendMessage(content)
        }

        // Simulate assistant response (in real implementation, this would come from backend)
        setIsTyping(true)

        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 1000))

        const assistantMessage = createMessage(
          "This is a simulated response. In production, this would come from your workflow backend.",
          "assistant",
        )

        setMessages(prev => {
          const updated = [...prev, assistantMessage]
          // Trim messages if exceeds max
          if (updated.length > maxMessages) {
            return updated.slice(-maxMessages)
          }
          return updated
        })

        onMessageReceived?.(assistantMessage)
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to send message")
        setError(error)
        onError?.(error)

        // Update message status to error
        setMessages(prev => prev.map(msg => (msg.id === userMessage.id ? { ...msg, status: "error" as const } : msg)))
      } finally {
        setIsTyping(false)
        setIsLoading(false)
      }
    },
    [onSendMessage, onMessageReceived, onError, maxMessages],
  )

  const retryMessage = useCallback(
    async (messageId: string) => {
      const message = messages.find(msg => msg.id === messageId)
      if (!message || message.role !== "user") return

      // Remove the failed message and any subsequent messages
      setMessages(prev => {
        const index = prev.findIndex(msg => msg.id === messageId)
        return prev.slice(0, index)
      })

      // Resend
      await sendMessage(message.content)
    },
    [messages, sendMessage],
  )

  const deleteMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId))
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setError(null)
    setStreamingMessage(null)
  }, [])

  const editMessage = useCallback((messageId: string, newContent: string) => {
    setMessages(prev =>
      prev.map(msg => (msg.id === messageId ? { ...msg, content: newContent, timestamp: new Date() } : msg)),
    )
  }, [])

  // ============================================================================
  // Streaming Support (Future Enhancement)
  // ============================================================================

  const _handleStreamUpdate = useCallback(
    (content: string) => {
      if (!enableStreaming) return

      setStreamingMessage(prev => {
        if (!prev) {
          return {
            id: createMessage("", "assistant").id,
            role: "assistant" as MessageRole,
            content,
            timestamp: new Date(),
            isComplete: false,
            status: "streaming" as const,
          }
        }
        return {
          ...prev,
          content: prev.content + content,
        }
      })
    },
    [enableStreaming],
  )

  const _handleStreamComplete = useCallback(() => {
    if (!streamingMessage) return

    const completedMessage: Message = {
      id: streamingMessage.id,
      role: streamingMessage.role,
      content: streamingMessage.content,
      timestamp: streamingMessage.timestamp,
      status: "sent",
    }

    setMessages(prev => [...prev, completedMessage])
    setStreamingMessage(null)
    setIsTyping(false)
  }, [streamingMessage])

  return {
    // State
    messages,
    isTyping,
    streamingMessage,
    error,
    isLoading,

    // Actions
    sendMessage,
    retryMessage,
    deleteMessage,
    clearMessages,
    editMessage,
  }
}
