"use client"

import { cn } from "@/lib/utils"
import { useAppStore } from "@/react-flow-visualization/store"
import { Panel } from "@xyflow/react"
import { ArrowUp, AudioWaveform, Globe, Loader2, Plus } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useShallow } from "zustand/react/shallow"

/**
 * WorkflowPromptBar - Edit or test workflows through natural language.
 * Toggle between edit mode (modify workflow structure) and test mode (run with input).
 */
export function WorkflowPromptBar() {
  const { exportToJSON, loadWorkflowFromData, organizeLayout } = useAppStore(
    useShallow(state => ({
      exportToJSON: state.exportToJSON,
      loadWorkflowFromData: state.loadWorkflowFromData,
      organizeLayout: state.organizeLayout,
    })),
  )

  const [prompt, setPrompt] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isTestMode, setIsTestMode] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return

    if (isTestMode) {
      // TODO: Implement test mode - run workflow with input
      toast.info("Test mode not yet implemented")
      return
    }

    setIsGenerating(true)

    try {
      const currentWorkflowJson = exportToJSON()
      const currentWorkflow = JSON.parse(currentWorkflowJson)

      const response = await fetch("/api/workflow/formalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          options: {
            workflowConfig: currentWorkflow,
            workflowGoal: prompt.trim(),
            verifyWorkflow: "none",
            repairWorkflowAfterGeneration: false,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to update workflow")
      }

      await loadWorkflowFromData(result.data)
      organizeLayout()

      setPrompt("")
      toast.success("Updated")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update"
      toast.error(errorMessage)
      console.error("Workflow update error:", error)
    } finally {
      setIsGenerating(false)
    }
  }, [prompt, isGenerating, isTestMode, exportToJSON, loadWorkflowFromData, organizeLayout])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
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
          placeholder={isTestMode ? "Enter test input for the workflow" : "Tell me how to change this"}
          disabled={isGenerating}
          className="flex-1 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-[15px] leading-[22px] resize-none outline-none disabled:opacity-50 px-5 pt-4 pb-1"
          rows={3}
          style={{
            minHeight: "80px",
            maxHeight: "200px",
          }}
        />

        <div className="flex items-center justify-between px-4 pb-4 pt-1">
          <div className="flex items-center gap-2">
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              aria-label="Add"
            >
              <Plus className="size-4" />
            </button>
            <button
              onClick={() => setIsTestMode(!isTestMode)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-gray-600 dark:text-gray-400",
                isTestMode ? "bg-gray-200 dark:bg-gray-800" : "hover:bg-gray-100 dark:hover:bg-gray-800",
              )}
              aria-label="Test workflow with input"
            >
              <Globe className="size-4" />
              <span className="text-sm">test workflow with input</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              aria-label="Audio"
            >
              <AudioWaveform className="size-4" />
            </button>
            {isGenerating ? (
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-400">
                <Loader2 className="size-4 text-white animate-spin" />
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim()}
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-full",
                  prompt.trim()
                    ? "bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:opacity-80"
                    : "bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed",
                )}
                aria-label="Submit"
              >
                <ArrowUp className="size-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Panel>
  )
}
