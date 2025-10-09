"use client"

import { cn } from "@/lib/utils"
import type { AppNode } from "@/react-flow-visualization/components/nodes/nodes"
import { Brain, Paperclip, Sparkles } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"

interface TestPanelProps {
  node: AppNode
}

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

export function TestPanel({ node }: TestPanelProps) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Mock response
      const allTools = [...(node.data.mcpTools || []), ...(node.data.codeTools || [])]
      const assistantMessage: Message = {
        role: "assistant",
        content: `Processing your request: "${userMessage.content}"\n\nThis is a simulated response from the ${node.id} agent. In production, this would show the actual output from running the agent with your input.\n\nThe agent is configured with model ${node.data.modelName || "default"} and has access to ${allTools.length} tools.`,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (_error) {
      const errorMessage: Message = {
        role: "assistant",
        content: "An error occurred while processing your request. Please try again.",
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      // Focus back on input
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [input, node.id, node.data])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <div className="text-center space-y-2">
              <p className="text-sm">Test your agent by asking questions</p>
              <p className="text-xs">Type a message below to start</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, idx) => (
              <div key={idx} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[70%] px-3.5 py-2.5 rounded-lg text-sm",
                    message.role === "user"
                      ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
                  )}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="px-3.5 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" />
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col gap-3">
          {/* Message input */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={2}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none resize-none leading-5 transition-colors focus:border-gray-400 dark:focus:border-gray-500"
            disabled={isLoading}
            style={{ minHeight: "60px", maxHeight: "120px" }}
          />

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            {/* Left side - Model selector */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-sm text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1.5 cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sonnet
              </button>
            </div>

            {/* Right side - Action icons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled
                className="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed rounded-md"
                title="Agent options"
              >
                <Brain className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled
                className="p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed rounded-md"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "p-2.5 rounded-lg transition-all ml-2",
                  input.trim() && !isLoading
                    ? "bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 dark:hover:bg-gray-600 text-white"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed",
                )}
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
    </div>
  )
}
