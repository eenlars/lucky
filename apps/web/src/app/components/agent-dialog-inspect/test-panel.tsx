"use client"

import type { AppNode } from "@/features/react-flow-visualization/components/nodes/nodes"
import { cn } from "@/lib/utils"
import { AIDevtools } from "@ai-sdk-tools/devtools"
import { useChat } from "@ai-sdk-tools/store"
import { DefaultChatTransport } from "ai"
import { Brain, Paperclip, Sparkles } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { MessagesArea } from "./MessagesArea"

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
        modelName: node.data.modelName ?? "openrouter#anthropic/claude-3.5-sonnet",
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
      <MessagesArea messages={messages} isLoading={isLoading} statusMessage={statusMessage} error={error} onRetry={() => regenerate()} />

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
        <AIDevtools modelId={node.data.modelName ?? "openrouter#anthropic/claude-3.5-sonnet"} />
      )}
    </div>
  )
}
