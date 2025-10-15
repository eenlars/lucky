"use client"

import { cn } from "@/lib/utils"
import { extractFetchError } from "@/lib/utils/extract-fetch-error"
import { AudioWaveform, Loader2, Pencil, Play, Plus } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

export interface PromptBarContext {
  // Type of context (workflow, mcp-config, etc)
  contextType: string

  // Get current state to send to AI
  getCurrentState: () => Promise<any>

  // Apply AI-generated changes
  applyChanges: (changes: any) => Promise<void>

  // Execute/run operation (optional)
  executeOperation?: (input: string) => Promise<void>

  // API endpoint for AI operations
  apiEndpoint: string

  // Optional custom placeholder text
  placeholder?: string

  // Mode: edit only, run only, or both
  mode?: "edit" | "run" | "both"

  // Position styling
  position?: "bottom" | "top" | "fixed"

  // Additional style classes
  className?: string

  // Callback for messages
  onMessage?: (message: string, type: "system" | "error" | "result") => void
}

interface PromptBarProps {
  context: PromptBarContext
}

export function PromptBar({ context }: PromptBarProps) {
  const {
    contextType,
    getCurrentState,
    applyChanges,
    executeOperation,
    apiEndpoint,
    placeholder = "Tell me how to change this, or provide input to run",
    mode = "both",
    position = "bottom",
    className,
    onMessage,
  } = context

  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const [streamedContent, setStreamedContent] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hideLogsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const addLog = useCallback(
    (message: string) => {
      setLogs(prev => [...prev, message])
      onMessage?.(message, "system")
    },
    [onMessage],
  )

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto"
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`
    }
  }, [prompt])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hideLogsTimeoutRef.current) {
        clearTimeout(hideLogsTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const handleEdit = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return

    if (hideLogsTimeoutRef.current) {
      clearTimeout(hideLogsTimeoutRef.current)
      hideLogsTimeoutRef.current = null
    }

    setIsGenerating(true)
    setLogs([])
    setShowLogs(true)
    setStreamedContent("")

    try {
      const currentState = await getCurrentState()
      addLog(`Analyzing ${contextType}...`)

      // Create abort controller for this request
      abortControllerRef.current = new AbortController()

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contextType,
          prompt: prompt.trim(),
          currentState,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorDetails = await extractFetchError(response)
        throw new Error(errorDetails)
      }

      addLog("Processing AI response...")

      // Simple JSON response - no streaming
      const result = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to update configuration")
      }

      const { config, explanation, changes } = result.data

      if (config) {
        addLog("Applying configuration changes...")
        await applyChanges(config)

        // Show what changed
        if (changes) {
          const { added, modified, removed } = changes
          const changeSummary = []
          if (added?.length > 0) changeSummary.push(`Added: ${added.join(", ")}`)
          if (modified?.length > 0) changeSummary.push(`Modified: ${modified.join(", ")}`)
          if (removed?.length > 0) changeSummary.push(`Removed: ${removed.join(", ")}`)

          if (changeSummary.length > 0) {
            addLog(changeSummary.join(" | "))
          }
        }

        toast.success(explanation || "Configuration updated successfully")
        addLog("✅ Configuration updated successfully")
      }

      setPrompt("")
      setStreamedContent("")

      // Keep logs visible briefly
      hideLogsTimeoutRef.current = setTimeout(() => {
        setShowLogs(false)
        setLogs([])
        hideLogsTimeoutRef.current = null
      }, 3000)
    } catch (error: any) {
      if (error.name === "AbortError") {
        addLog("Request cancelled")
      } else {
        const errorMsg = error instanceof Error ? error.message : "Update failed"
        toast.error(errorMsg)
        addLog(`Error: ${errorMsg}`)
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }, [prompt, isGenerating, contextType, getCurrentState, apiEndpoint, applyChanges, addLog])

  const handleRun = useCallback(async () => {
    if (!prompt.trim() || isGenerating || !executeOperation) return

    if (hideLogsTimeoutRef.current) {
      clearTimeout(hideLogsTimeoutRef.current)
      hideLogsTimeoutRef.current = null
    }

    setIsGenerating(true)
    setLogs([])
    setShowLogs(true)

    try {
      await executeOperation(prompt.trim())
      toast.success("Operation completed")
      setPrompt("")
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Operation failed"
      toast.error(errorMsg)
      addLog(`Error: ${errorMsg}`)
    }

    setIsGenerating(false)
  }, [prompt, isGenerating, executeOperation, addLog])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleEdit()
    }
  }

  // Position classes
  const positionClasses = {
    bottom: "fixed bottom-8 left-1/2 -translate-x-1/2",
    top: "fixed top-8 left-1/2 -translate-x-1/2",
    fixed: "",
  }

  return (
    <div className={cn(positionClasses[position], "z-50", className)}>
      <div className="flex flex-col bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg w-[720px]">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isGenerating}
          className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-[15px] leading-[22px] resize-none outline-none disabled:opacity-50 px-5 pt-4 pb-1"
          rows={3}
          style={{
            minHeight: "80px",
            maxHeight: "200px",
          }}
        />

        {/* Logs Display */}
        {showLogs && logs.length > 0 && (
          <div className="mx-4 mb-2 max-h-32 overflow-auto rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2 text-xs font-mono">
            {logs.map((log, i) => (
              <p key={i} className="break-words text-gray-700 dark:text-gray-300">
                {log}
              </p>
            ))}
          </div>
        )}

        {/* Streamed Content Preview */}
        {streamedContent && (
          <div className="mx-4 mb-2 max-h-48 overflow-auto rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all text-gray-700 dark:text-gray-300">
              {streamedContent.slice(-500)}
              {streamedContent.length > 500 && "..."}
            </pre>
          </div>
        )}

        <div className="flex items-center justify-between px-4 pb-4 pt-1">
          <div className="flex items-center gap-2">
            {/* Icons removed for MCP config context */}
            {contextType !== "mcp-config" && (
              <>
                <button
                  type="button"
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                  aria-label="Add"
                >
                  <Plus className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                  aria-label="Audio"
                >
                  <AudioWaveform className="size-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isGenerating ? (
              <div className="flex items-center justify-center gap-2 px-3 h-9 rounded-lg relative overflow-hidden bg-blue-600">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    background:
                      "linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.3) 25%, rgba(255,255,255,0.3) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.3) 75%)",
                    backgroundSize: "20px 20px",
                    animation: "stripe-slide 0.6s linear infinite",
                  }}
                />
                <Loader2 className="size-4 text-white animate-spin relative z-10" />
                <span className="text-sm text-white relative z-10">Working...</span>
              </div>
            ) : (
              <>
                {(mode === "edit" || mode === "both") && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    disabled={!prompt.trim()}
                    className={cn(
                      "flex items-center gap-2 px-3 h-9 rounded-lg transition-all text-sm",
                      prompt.trim()
                        ? "bg-blue-600 dark:bg-blue-500 text-white hover:opacity-80"
                        : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed",
                    )}
                    aria-label="Edit configuration"
                  >
                    <Pencil className="size-4" strokeWidth={2.5} />
                    <span>Edit</span>
                  </button>
                )}
                {(mode === "run" || mode === "both") && executeOperation && (
                  <button
                    type="button"
                    onClick={handleRun}
                    disabled={!prompt.trim()}
                    className={cn(
                      "flex items-center gap-2 px-3 h-9 rounded-lg transition-all text-sm",
                      prompt.trim()
                        ? "bg-green-600 dark:bg-green-500 text-white hover:opacity-80"
                        : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed",
                    )}
                    aria-label="Run operation"
                  >
                    <Play className="size-4" strokeWidth={2.5} />
                    <span>Run</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add animation styles */}
      <style jsx>{`
        @keyframes stripe-slide {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 20px 20px;
          }
        }
      `}</style>
    </div>
  )
}
