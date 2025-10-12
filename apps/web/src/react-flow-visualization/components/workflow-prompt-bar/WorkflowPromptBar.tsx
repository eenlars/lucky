"use client"

import { cn } from "@/lib/utils"
import { useAppStore } from "@/react-flow-visualization/store/store"
import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import { Panel } from "@xyflow/react"
import { AudioWaveform, Loader2, Pencil, Play, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useShallow } from "zustand/react/shallow"
import { executeEditMode } from "./edit-mode-handler"
import { executeRunMode } from "./run-mode-handler"

/**
 * WorkflowPromptBar - Dual-mode workflow interaction component.
 *
 * Two distinct modes:
 * 1. Edit Mode (default): AI-powered workflow structure modification
 *    - Changes nodes, edges, and workflow structure
 *    - Uses natural language to describe changes
 *    - Calls /api/workflow/formalize
 *
 * 2. Run Mode: Execute workflow with user-provided input
 *    - Runs the current workflow as-is
 *    - User input becomes the workflow's initial input
 *    - Calls /api/workflow/invoke
 */
export function WorkflowPromptBar() {
  const router = useRouter()
  const { exportToJSON, loadWorkflowFromData, organizeLayout, addChatMessage } = useAppStore(
    useShallow(state => ({
      exportToJSON: state.exportToJSON,
      loadWorkflowFromData: state.loadWorkflowFromData,
      organizeLayout: state.organizeLayout,
      addChatMessage: state.addChatMessage,
    })),
  )

  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [showLogs, setShowLogs] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const hideLogsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const addLog = useCallback(
    (message: string) => {
      setLogs(prev => [...prev, message])
      // Also add to chat sidebar
      addChatMessage(message, "system")
    },
    [addChatMessage],
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
      // Cmd/Ctrl + K to focus
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
    }
  }, [])

  const handleEdit = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return

    console.log("🔵 EDIT MODE: Modifying workflow structure")

    // Clear any pending hide timeout from previous runs
    if (hideLogsTimeoutRef.current) {
      clearTimeout(hideLogsTimeoutRef.current)
      hideLogsTimeoutRef.current = null
    }

    setIsGenerating(true)
    setLogs([])
    setShowLogs(true)

    // Edit Mode: Modify workflow structure with AI
    const result = await executeEditMode(prompt.trim(), exportToJSON, addLog)

    if (result.success && result.workflowConfig) {
      await loadWorkflowFromData(result.workflowConfig)
      await organizeLayout()
      setPrompt("")
      toast.success("Workflow updated")
      // Hide logs after edit mode completes (user doesn't need to see technical details)
      hideLogsTimeoutRef.current = setTimeout(() => {
        setShowLogs(false)
        hideLogsTimeoutRef.current = null
      }, 2000)
    } else {
      toast.error(result.error || "Failed to update workflow")
    }

    setIsGenerating(false)
  }, [prompt, isGenerating, exportToJSON, loadWorkflowFromData, organizeLayout, addLog])

  const handleRun = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return

    console.log("🟢 RUN MODE: Executing workflow with input")

    // Clear any pending hide timeout from previous runs
    if (hideLogsTimeoutRef.current) {
      clearTimeout(hideLogsTimeoutRef.current)
      hideLogsTimeoutRef.current = null
    }

    setIsGenerating(true)
    setLogs([])
    setShowLogs(true)

    // Run Mode: Execute workflow with input
    const result = await executeRunMode(prompt.trim(), exportToJSON, addLog, (finalMessage: string) => {
      addChatMessage(finalMessage, "result")
    })

    if (result.success) {
      toast.success("Workflow completed")
      setPrompt("")
      // Keep logs visible in run mode so user can see output
    } else {
      // Check if error is MISSING_API_KEYS and show clickable link
      if (result.errorCode === ErrorCodes.MISSING_API_KEYS) {
        toast.error(result.error || "Missing API Keys", {
          action: {
            label: "Go to Settings",
            onClick: () => router.push("/settings/providers"),
          },
          duration: 10000, // Show for 10 seconds to give user time to click
        })
      } else {
        toast.error(result.error || "Workflow execution failed")
      }
      addChatMessage(result.error || "Workflow execution failed", "error")
    }

    setIsGenerating(false)
  }, [prompt, isGenerating, exportToJSON, addLog, addChatMessage, router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      // Default to edit mode on keyboard shortcut
      handleEdit()
    }
  }

  return (
    <Panel position="bottom-center" className="!pointer-events-none" style={{ marginBottom: "80px" }}>
      <div
        className="pointer-events-auto flex flex-col bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg w-[720px]"
        style={{ zIndex: 50 }}
      >
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tell me how to change this, or provide input to run"
          disabled={isGenerating}
          className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-[15px] leading-[22px] resize-none outline-none disabled:opacity-50 px-5 pt-4 pb-1"
          rows={3}
          style={{
            minHeight: "80px",
            maxHeight: "200px",
          }}
        />

        {/* Logs Display (shown during and after execution) */}
        {showLogs && logs.length > 0 && (
          <div className="mx-4 mb-2 max-h-32 overflow-auto rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2 text-xs font-mono">
            {logs.map((log, i) => (
              <p key={i} className="break-words text-gray-700 dark:text-gray-300">
                {log}
              </p>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between px-4 pb-4 pt-1">
          <div className="flex items-center gap-2">
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
          </div>

          <div className="flex items-center gap-2">
            {isGenerating ? (
              <div className="flex items-center justify-center gap-2 px-3 h-9 rounded-lg relative overflow-hidden bg-blue-600">
                {/* Stripe-like animated gradient overlay */}
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
                  aria-label="Edit workflow"
                >
                  <Pencil className="size-4" strokeWidth={2.5} />
                  <span>Edit</span>
                </button>
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
                  aria-label="Run workflow"
                >
                  <Play className="size-4" strokeWidth={2.5} />
                  <span>Run</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Panel>
  )
}
