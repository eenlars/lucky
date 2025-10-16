/**
 * useChat Hook
 *
 * Main chat state management hook
 * Handles messages, sending, streaming, and error states
 */

import { logException } from "@/lib/error-logger"
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
  /** Use simulated responses instead of real AI calls (default: true) */
  useSimulation?: boolean
  /** Model name for real AI calls (e.g., "openai/gpt-4") */
  modelName?: string
  /** Node ID for agent context */
  nodeId?: string
  /** System prompt for the agent */
  systemPrompt?: string
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
    useSimulation = true,
    modelName,
    nodeId = "default-node",
    systemPrompt,
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

        setIsTyping(true)

        if (useSimulation) {
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
        } else {
          // Real AI call using /api/agent/chat
          if (!modelName) {
            throw new Error("Model name is required for real AI calls")
          }

          // Convert messages to UIMessage format expected by the API
          const uiMessages = messages
            .concat(userMessage)
            .filter(msg => msg.role !== "system")
            .map(msg => ({
              id: msg.id,
              role: msg.role,
              parts: [{ type: "text" as const, text: msg.content }],
            }))

          const response = await fetch("/api/agent/chat", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: uiMessages,
              nodeId,
              modelName,
              systemPrompt,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || "Failed to get AI response")
          }

          // Handle streaming response
          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error("No response body")
          }

          const decoder = new TextDecoder()
          let assistantContent = ""
          const assistantMessageId = createMessage("", "assistant").id

          // Create streaming message placeholder
          setMessages(prev => [
            ...prev,
            {
              id: assistantMessageId,
              role: "assistant" as const,
              content: "",
              timestamp: new Date(),
              status: "streaming" as const,
            },
          ])

          // Read stream
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("0:")) {
                // Parse the streaming data
                try {
                  const jsonStr = line.slice(2).trim()
                  if (jsonStr) {
                    const data = JSON.parse(jsonStr)
                    if (data.type === "text" && data.text) {
                      assistantContent += data.text
                      // Update message with accumulated content
                      setMessages(prev =>
                        prev.map(msg =>
                          msg.id === assistantMessageId ? { ...msg, content: assistantContent } : msg,
                        ),
                      )
                    }
                  }
                } catch (e) {
                  // Skip malformed JSON
                  console.error("Failed to parse stream chunk:", e)
                }
              }
            }
          }

          // Finalize message
          const finalMessage = createMessage(assistantContent, "assistant")
          setMessages(prev =>
            prev.map(msg => (msg.id === assistantMessageId ? { ...finalMessage, id: assistantMessageId } : msg)),
          )

          onMessageReceived?.(finalMessage)
        }
      } catch (err) {
        logException(err, {
          location: "/hook/useChat",
        })
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
    [
      onSendMessage,
      onMessageReceived,
      onError,
      maxMessages,
      useSimulation,
      modelName,
      nodeId,
      systemPrompt,
      messages,
    ],
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
