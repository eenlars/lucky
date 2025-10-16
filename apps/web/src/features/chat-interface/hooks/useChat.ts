/**
 * useChat Hook
 *
 * Chat state management hook for SIMULATION MODE ONLY
 * For real AI mode, use ChatInterfaceReal with Provider pattern
 */

import { logException } from "@/lib/error-logger"
import type { UIMessage } from "@ai-sdk-tools/store"
import { useCallback, useRef, useState } from "react"
import { createMessage, getMessageText } from "../utils/message-utils"

type MessageRole = "user" | "assistant" | "system"

export interface ChatState {
  messages: UIMessage[]
  isTyping: boolean
  streamingMessage: Partial<UIMessage> | null
  error: Error | null
}

export interface ChatActions {
  sendMessage: (content: string) => Promise<void>
  retryMessage: (messageId: string) => Promise<void>
  deleteMessage: (messageId: string) => void
  clearMessages: () => void
  editMessage: (messageId: string, newContent: string) => void
}

export interface UseChatOptions {
  /** Initial messages */
  initialMessages?: UIMessage[]
  /** Callback when message is sent */
  onSendMessage?: (content: string) => void | Promise<void>
  /** Callback when message is received */
  onMessageReceived?: (message: UIMessage) => void
  /** Callback when error occurs */
  onError?: (error: Error) => void
  /** Enable streaming responses */
  enableStreaming?: boolean
  /** Maximum number of messages to keep */
  maxMessages?: number
  /** Use simulated responses (always true for this hook) */
  useSimulation?: boolean
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
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages)
  const [isTyping, setIsTyping] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState<Partial<UIMessage> | null>(null)
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

      const userMessage = createMessage(content, "user")

      // Add user message
      setMessages(prev => [...prev, userMessage])
      setError(null)
      setIsLoading(true)

      try {
        // Call callback
        if (onSendMessage) {
          await onSendMessage(content)
        }

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
        logException(err, {
          location: "/hook/useChat",
        })
        const error = err instanceof Error ? err : new Error("Failed to send message")
        setError(error)
        onError?.(error)
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
      await sendMessage(getMessageText(message))
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
      prev.map(msg =>
        msg.id === messageId ? { ...msg, parts: [{ type: "text", text: newContent }] } : msg,
      ),
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
            parts: [{ type: "text", text: content }],
          }
        }
        const existingText = (prev.parts?.[0] as any)?.text || ""
        return {
          ...prev,
          parts: [{ type: "text", text: existingText + content }],
        }
      })
    },
    [enableStreaming],
  )

  const _handleStreamComplete = useCallback(() => {
    if (!streamingMessage) return

    const completedMessage: UIMessage = {
      id: streamingMessage.id!,
      role: streamingMessage.role!,
      parts: streamingMessage.parts!,
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
