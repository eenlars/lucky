"use client"

import { calculateCost } from "@core/messages/api/vercel/pricing/calculatePricing"
import type { TokenUsage } from "@core/utils/spending/models.types"
import "highlight.js/styles/github.css"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from "react-markdown"
import rehypeHighlight from "rehype-highlight"
import remarkGfm from "remark-gfm"

interface Message {
  id: string
  content: string
  isUser: boolean
  timestamp: string
  isMarkdown?: boolean
  cost?: number
  model?: string
  tokens?: TokenUsage
}

interface CallInfo {
  model: string
  cost: number
  tokens: TokenUsage
  timestamp: string
}

const isMarkdownContent = (content: string): boolean => {
  const markdownPatterns = [
    /^#{1,6}\s+.+$/m,
    /\*\*.*?\*\*/,
    /\*.*?\*/,
    /`.*?`/,
    /```[\s\S]*?```/,
    /^\s*[-*+]\s+.+$/m,
    /^\s*\d+\.\s+.+$/m,
    /\[.*?\]\(.*?\)/,
    /^\s*\|.*\|.*$/m,
    /^>\s+.+$/m,
    /^---+$/m,
    /^\s*```/m,
  ]

  return markdownPatterns.some((pattern) => pattern.test(content))
}

export default function TestPage() {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [calls, setCalls] = useState<CallInfo[]>([])
  const [totalCost, setTotalCost] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Focus input on mount
    inputRef.current?.focus()
  }, [])

  const sendMessage = async () => {
    if (!message.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: message,
      isUser: true,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setMessage("")
    setLoading(true)

    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      })

      const data = await res.json()

      // Handle both success and error responses
      let content = "No response received"
      if (data.error) {
        content = `Error: ${data.error}`
      } else if (data.message) {
        content = data.message
      }

      // Track API call cost and prepare message data
      let messageData: Partial<Pick<Message, "cost" | "model" | "tokens">> = {}

      if (data.usage && data.model) {
        const cost = calculateCost(data.model, {
          inputTokens: data.usage.prompt_tokens || 0,
          outputTokens: data.usage.completion_tokens || 0,
          cachedInputTokens: data.usage.cached_tokens || 0,
        })

        const tokens: TokenUsage = {
          inputTokens: data.usage.prompt_tokens || 0,
          outputTokens: data.usage.completion_tokens || 0,
          cachedInputTokens: data.usage.cached_tokens || 0,
        }

        const callInfo: CallInfo = {
          model: data.model,
          cost,
          tokens,
          timestamp: new Date().toISOString(),
        }

        setCalls((prev) => [...prev, callInfo])
        setTotalCost((prev) => prev + cost)

        messageData = { cost, model: data.model, tokens }
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        content,
        isUser: false,
        timestamp: data.timestamp || new Date().toISOString(),
        isMarkdown: isMarkdownContent(content),
        ...messageData,
      }

      setMessages((prev) => [...prev, botMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Error: Failed to send message",
        isUser: false,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
      // Refocus input after sending
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const testGet = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/test")
      const data = await res.json()

      const content = `Test Response: ${data.message}\nStatus: ${data.status}`

      // Track API call cost and prepare message data
      let messageData: Partial<Pick<Message, "cost" | "model" | "tokens">> = {}

      if (data.usage && data.model) {
        const cost = calculateCost(data.model, {
          inputTokens: data.usage.prompt_tokens || 0,
          outputTokens: data.usage.completion_tokens || 0,
          cachedInputTokens: data.usage.cached_tokens || 0,
        })

        const tokens: TokenUsage = {
          inputTokens: data.usage.prompt_tokens || 0,
          outputTokens: data.usage.completion_tokens || 0,
          cachedInputTokens: data.usage.cached_tokens || 0,
        }

        const callInfo: CallInfo = {
          model: data.model,
          cost,
          tokens,
          timestamp: new Date().toISOString(),
        }

        setCalls((prev) => [...prev, callInfo])
        setTotalCost((prev) => prev + cost)

        messageData = { cost, model: data.model, tokens }
      }

      const testMessage: Message = {
        id: Date.now().toString(),
        content,
        isUser: false,
        timestamp: data.timestamp || new Date().toISOString(),
        isMarkdown: isMarkdownContent(content),
        ...messageData,
      }

      setMessages((prev) => [...prev, testMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: "Error: Failed to test connection",
        isUser: false,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    setCalls([])
    setTotalCost(0)
    inputRef.current?.focus()
  }

  const _handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !loading && message.trim()) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-[calc(100vh-56px)] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header Bar */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 shadow-sm flex-shrink-0">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  AI Assistant Test
                </h1>
                <p className="text-xs text-gray-600 hidden sm:block">
                  Test the AI assistant functionality and API connections
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end space-x-3">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div
                    className={`w-2 h-2 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-green-400"}`}
                  ></div>
                  <span className="hidden sm:inline">
                    {loading ? "Processing..." : "Ready"}
                  </span>
                  <span className="sm:hidden">{loading ? "..." : "Ready"}</span>
                </div>
                {totalCost > 0 && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 text-green-700 rounded-lg border border-green-200">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                    <span className="text-xs font-medium">
                      ${totalCost.toFixed(6)}
                    </span>
                    <span className="text-xs hidden sm:inline">
                      ({calls.length} call{calls.length !== 1 ? "s" : ""})
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={testGet}
                disabled={loading}
                className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium text-sm transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
              >
                <svg
                  className="w-4 h-4 sm:mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="hidden sm:inline">Test</span>
              </button>
              <button
                onClick={clearChat}
                className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg
                  className="w-4 h-4 sm:mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split Screen Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Input */}
        <div className="lg:w-1/2 lg:border-r border-gray-200 bg-white flex flex-col">
          {/* Input Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <div className="flex items-center space-x-3">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  Input Editor
                </h3>
                <div className="text-sm text-gray-500">
                  {message.length.toLocaleString()} chars
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end space-x-2">
                <button
                  onClick={() => setMessage("")}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Clear
                </button>
                <div className="text-xs sm:text-sm text-gray-500">
                  Ctrl+Enter to send
                </div>
              </div>
            </div>
          </div>

          {/* Large Input Textarea */}
          <div className="flex-1 p-4 sm:p-6 min-h-[300px] lg:min-h-0">
            <div className="relative h-full">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    (e.ctrlKey || e.metaKey) &&
                    !loading &&
                    message.trim()
                  ) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                className="w-full h-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-gray-900 placeholder-gray-500 resize-none font-mono text-sm leading-relaxed"
                placeholder="Type or paste your large input here...

• Use Ctrl+Enter (Cmd+Enter on Mac) to send
• Regular Enter creates new lines
• Perfect for large prompts, code, documents, etc.
• Character count shown above
• Monospace font for better readability"
                disabled={loading}
              />
            </div>
          </div>

          {/* Input Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm text-gray-600 overflow-x-auto">
                <div>Lines: {message.split("\n").length}</div>
                <div>
                  Words:{" "}
                  {message.trim() ? message.trim().split(/\s+/).length : 0}
                </div>
                <div
                  className={`px-2 py-1 rounded text-xs whitespace-nowrap ${
                    message.length > 10000
                      ? "bg-yellow-100 text-yellow-800"
                      : message.length > 5000
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {message.length > 10000
                    ? "Very Large"
                    : message.length > 5000
                      ? "Large"
                      : "Normal"}
                </div>
              </div>

              <button
                onClick={sendMessage}
                disabled={loading || !message.trim()}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-medium transition-all duration-200 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                    <span>Send</span>
                    <kbd className="px-2 py-1 bg-white/20 rounded text-xs hidden sm:inline">
                      Ctrl+↵
                    </kbd>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Output */}
        <div className="lg:w-1/2 bg-white flex flex-col border-t lg:border-t-0 border-gray-200">
          {/* Output Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                Output
              </h3>
              <div className="flex items-center space-x-2 sm:space-x-4 text-sm text-gray-500">
                <span>
                  {messages.length} {messages.length === 1 ? "msg" : "msgs"}
                </span>
                {calls.length > 0 && (
                  <div className="flex items-center space-x-1 text-xs">
                    <span className="font-medium text-green-600">
                      ${totalCost.toFixed(6)} total
                    </span>
                    <span>•</span>
                    <span>
                      {calls
                        .reduce(
                          (sum, call) =>
                            sum +
                            call.tokens.inputTokens +
                            call.tokens.outputTokens,
                          0
                        )
                        .toLocaleString()}{" "}
                      tokens
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-[400px] lg:min-h-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-6 sm:p-8 max-w-sm sm:max-w-lg mx-auto border border-gray-100">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-sm">
                    <svg
                      className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
                    Welcome to AI Chat
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4 leading-relaxed">
                    Start a conversation by typing a message in the input panel{" "}
                    <span className="hidden lg:inline">
                      , or test the connection with the button above
                    </span>
                    . Your messages and AI responses will appear here.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-2 text-xs sm:text-sm text-gray-500">
                    <kbd className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium shadow-sm">
                      Ctrl+Enter
                    </kbd>
                    <span>to send message</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex max-w-[90%] ${msg.isUser ? "flex-row-reverse" : "flex-row"} items-start space-x-3`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                          msg.isUser
                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 ml-3"
                            : "bg-gradient-to-br from-gray-400 to-gray-500 mr-3"
                        }`}
                      >
                        {msg.isUser ? (
                          <svg
                            className="w-4 h-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4 text-white"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                          </svg>
                        )}
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 shadow-sm border ${
                          msg.isUser
                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-blue-300"
                            : "bg-white text-gray-900 border-gray-200"
                        }`}
                      >
                        {msg.isUser || !msg.isMarkdown ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                          </p>
                        ) : (
                          <div className="text-sm leading-relaxed prose prose-sm max-w-none">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeHighlight]}
                              components={{
                                pre: ({ children }) => (
                                  <pre className="bg-gray-100 rounded-lg p-3 overflow-x-auto">
                                    {children}
                                  </pre>
                                ),
                                code: ({ children, className }) => {
                                  const isInline = !className
                                  return isInline ? (
                                    <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
                                      {children}
                                    </code>
                                  ) : (
                                    <code className={className}>
                                      {children}
                                    </code>
                                  )
                                },
                                table: ({ children }) => (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full border border-gray-300">
                                      {children}
                                    </table>
                                  </div>
                                ),
                                th: ({ children }) => (
                                  <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-left">
                                    {children}
                                  </th>
                                ),
                                td: ({ children }) => (
                                  <td className="border border-gray-300 px-2 py-1">
                                    {children}
                                  </td>
                                ),
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        )}
                        <div
                          className={`text-xs mt-2 ${msg.isUser ? "text-blue-100" : "text-gray-500"} flex flex-col space-y-1`}
                        >
                          <div className="flex items-center justify-between">
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <div className="flex items-center space-x-2">
                              {!msg.isUser && msg.isMarkdown && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                  Markdown
                                </span>
                              )}
                              {!msg.isUser && msg.cost !== undefined && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                  ${msg.cost.toFixed(6)}
                                </span>
                              )}
                            </div>
                          </div>
                          {!msg.isUser && msg.model && msg.tokens && (
                            <div className="text-xs text-gray-400 flex items-center space-x-2">
                              <span className="font-mono">
                                {msg.model.replace(/^[^/]+\//, "")}
                              </span>
                              <span>•</span>
                              <span>
                                {(
                                  msg.tokens.inputTokens +
                                  msg.tokens.outputTokens
                                ).toLocaleString()}{" "}
                                tokens
                              </span>
                              {msg.tokens.cachedInputTokens &&
                                msg.tokens.cachedInputTokens > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>
                                      {msg.tokens.cachedInputTokens.toLocaleString()}{" "}
                                      cached
                                    </span>
                                  </>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="flex max-w-[90%] items-start space-x-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-3 bg-gradient-to-br from-gray-400 to-gray-500 shadow-sm">
                        <svg
                          className="w-4 h-4 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </div>
                      <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-200">
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div
                              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600 font-medium">
                            AI is thinking...
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
