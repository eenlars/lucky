"use client"

import { AnimatedStatusText } from "@/components/ui/animated-status-text"
import type { AppNode } from "@/features/react-flow-visualization/components/nodes/nodes"
import { cn } from "@/lib/utils"
import { AIDevtools } from "@ai-sdk-tools/devtools"
import { useChat } from "@ai-sdk-tools/store"
import { DefaultChatTransport } from "ai"
import { ArrowDown, Brain, Paperclip, Sparkles } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom"

interface TestPanelProps {
  node: AppNode
}

const MAX_MESSAGES = 50 // Limit conversation length to prevent memory issues

export function TestPanel({ node }: TestPanelProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  // Use AI SDK's useChat hook for streaming with retry logic
  const { messages, sendMessage, status, error, regenerate, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agent/chat",
      body: {
        nodeId: node.id,
        modelName: node.data.modelName ?? "openrouter/anthropic/claude-3.5-sonnet",
        systemPrompt: node.data.systemPrompt,
      },
    }),
    onData: dataPart => {
      // Handle transient status updates
      if (dataPart.type === "data-status") {
        setStatusMessage((dataPart.data as any).message)
      }
    },
    onFinish: () => {
      // Clear status when stream completes
      setStatusMessage(null)
    },
    onError: error => {
      console.error("Chat error:", error)
      setStatusMessage(null)
    },
  })

  const isLoading = status === "submitted" || status === "streaming"

  // Clear status message when first token arrives
  useEffect(() => {
    if (statusMessage && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.role === "assistant") {
        const hasContent = lastMessage.parts.some(part => part.type === "text" && part.text.trim())
        if (hasContent) {
          setStatusMessage(null)
        }
      }
    }
  }, [messages, statusMessage])

  // Enforce message limit
  useEffect(() => {
    if (messages.length > MAX_MESSAGES) {
      // Keep only the most recent messages
      setMessages(messages.slice(-MAX_MESSAGES))
    }
  }, [messages, setMessages])

  const handleClearConversation = () => {
    if (confirm("Clear this conversation? This cannot be undone.")) {
      setMessages([])
      setInputValue("")
    }
  }

  const handleSubmit = () => {
    if (!inputValue.trim() || isLoading) return

    sendMessage({ text: inputValue })
    setInputValue("")
    // Focus back on input after a brief delay
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area with Smart Auto-Scroll */}
      <StickToBottom className="flex-1 overflow-y-auto relative" initial="smooth" resize="smooth">
        <StickToBottom.Content className="p-6">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
              <div className="text-center space-y-2">
                <p className="text-sm">Test your agent by asking questions</p>
                <p className="text-xs">Type a message below to start</p>
              </div>
            </div>
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
                .map(message => (
                  <div
                    key={message.id}
                    className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[70%] px-3.5 py-2.5 rounded-lg text-sm",
                        message.role === "user"
                          ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                      )}
                    >
                      <div className="whitespace-pre-wrap leading-relaxed">
                        {message.parts.map((part, i) => {
                          if (part.type === "text") {
                            return <span key={i}>{part.text}</span>
                          }
                          return null
                        })}
                      </div>
                    </div>
                  </div>
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
                    <button
                      type="button"
                      onClick={() => regenerate()}
                      aria-label="Retry sending message"
                      className="mt-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 rounded text-xs font-medium transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </StickToBottom.Content>

        {/* Scroll to bottom button */}
        <ScrollToBottomButton />
      </StickToBottom>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-3">
          {/* Message input */}
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            aria-label="Chat message input"
            aria-describedby={error ? "chat-error" : undefined}
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none leading-5 transition-colors focus:border-gray-400 dark:focus:border-gray-500"
            disabled={isLoading}
            style={{ minHeight: "60px", maxHeight: "120px" }}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            {/* Left side - Model indicator and clear button */}
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {node.data.modelName?.split("/").pop() || "Claude"}
              </div>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearConversation}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  title="Clear conversation"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Right side - Action icons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled
                className="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed rounded-md"
                title="Agent options (coming soon)"
              >
                <Brain className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled
                className="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed rounded-md"
                title="Attach file (coming soon)"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!inputValue.trim() || isLoading}
                className={cn(
                  "p-2.5 rounded-lg transition-all ml-2",
                  inputValue.trim() && !isLoading
                    ? "bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed",
                )}
                title="Send message (Enter)"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                    <path
                      d="M8 2L8 12M8 2L4 6M8 2L12 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AI Devtools - Development only */}
      {process.env.NODE_ENV === "development" && (
        <AIDevtools modelId={node.data.modelName ?? "openrouter/anthropic/claude-3.5-sonnet"} />
      )}
    </div>
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
