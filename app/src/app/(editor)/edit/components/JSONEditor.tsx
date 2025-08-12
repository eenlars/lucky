"use client"

// Removed server action import - using API route instead
import { useAppStore } from "@/react-flow-visualization/store"
import {
  ensureWorkflowExists,
  saveWorkflowVersion,
} from "@/trace-visualization/db/Workflow/retrieveWorkflow"
import { createWorkflowPrompt } from "@core/prompts/createWorkflow"
import type { Tables } from "@core/utils/clients/supabase/types"
import { genShortId } from "@core/utils/common/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import ImprovedJSONEditor from "../[wf_version_id]/components/ImprovedJSONEditor"
import { WORKFLOW_TEMPLATES } from "./workflow-templates"

interface JSONEditorProps {
  workflowVersion?: Tables<"WorkflowVersion">
  initialContent?: string
  onContentChange?: (content: string) => void
}

export default function JSONEditor({
  workflowVersion,
  initialContent,
  onContentChange,
}: JSONEditorProps) {
  const router = useRouter()

  const { workflowJSON, updateWorkflowJSON } = useAppStore(
    useShallow((state) => ({
      workflowJSON: state.workflowJSON,
      updateWorkflowJSON: state.updateWorkflowJSON,
    }))
  )
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [commitMessage, setCommitMessage] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<{
    isValid: boolean
    errors: string[]
  } | null>(null)
  const [feedback, setFeedback] = useState("")
  const [showSystemPrompt, setShowSystemPrompt] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizeError, setOptimizeError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [jsonParseError, setJsonParseError] = useState<string | null>(null)

  // Helper function to format time
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    
    if (minutes < 1) return "just now"
    if (minutes === 1) return "1 min ago"
    if (minutes < 60) return `${minutes} mins ago`
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Update store when initialContent prop changes
  useEffect(() => {
    if (initialContent && initialContent !== workflowJSON) {
      updateWorkflowJSON(initialContent)
    }
  }, [initialContent, workflowJSON, updateWorkflowJSON])

  const handleDslChange = (newContent: string) => {
    updateWorkflowJSON(newContent)
    setIsDirty(true)
    setVerificationResult(null)
    
    // Validate JSON in real-time
    try {
      JSON.parse(newContent)
      setJsonParseError(null)
    } catch (error) {
      setJsonParseError(error instanceof Error ? error.message : "Invalid JSON")
    }
    
    onContentChange?.(newContent)
  }

  // Auto-save functionality with debounce
  useEffect(() => {
    if (!isDirty || !autoSaveEnabled || !workflowVersion) return
    
    const autoSaveTimeout = setTimeout(() => {
      // Only auto-save if JSON is valid
      if (!jsonParseError) {
        localStorage.setItem(`workflow_draft_${workflowVersion.wf_version_id}`, workflowJSON)
        setLastSaved(new Date())
      }
    }, 2000) // 2 second debounce

    return () => clearTimeout(autoSaveTimeout)
  }, [workflowJSON, isDirty, autoSaveEnabled, workflowVersion, jsonParseError])

  // Load draft on mount
  useEffect(() => {
    if (workflowVersion?.wf_version_id) {
      const draft = localStorage.getItem(`workflow_draft_${workflowVersion.wf_version_id}`)
      if (draft && draft !== workflowJSON) {
        // Show option to restore draft
        const shouldRestore = window.confirm(
          "Found a more recent draft of this workflow. Would you like to restore it?"
        )
        if (shouldRestore) {
          updateWorkflowJSON(draft)
          setIsDirty(true)
        }
      }
    }
  }, [workflowVersion?.wf_version_id])

  const handleVerify = useCallback(async () => {
    setIsVerifying(true)
    setVerificationResult(null)

    try {
      const workflow = parseWorkflowSafely(workflowJSON)
      const verificationResult = await verifyWorkflowWithAPI(workflow)
      setVerificationResult(verificationResult)
    } catch (error) {
      setVerificationResult(createErrorResult(error))
    } finally {
      setIsVerifying(false)
    }
  }, [workflowJSON])

  const verifyWorkflowWithAPI = async (workflow: any) => {
    const response = await fetch("/api/workflow/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflow }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  const createErrorResult = (error: unknown) => ({
    isValid: false,
    errors: [
      error instanceof Error
        ? `Verification Error: ${error.message}`
        : "Unknown verification error",
    ],
  })

  const handleOptimize = useCallback(async () => {
    if (!feedback.trim()) {
      setOptimizeError("Please provide feedback before optimizing")
      return
    }

    setIsOptimizing(true)
    setOptimizeError(null)

    try {
      const currentWorkflow = parseWorkflowSafely(workflowJSON)
      const optimizedWorkflow = await generateOptimizedWorkflow(
        currentWorkflow,
        feedback
      )

      applyOptimizedWorkflow(optimizedWorkflow)
    } catch (error) {
      handleOptimizationError(error)
    } finally {
      setIsOptimizing(false)
    }
  }, [
    workflowJSON,
    feedback,
    updateWorkflowJSON,
    setIsDirty,
    setFeedback,
    setVerificationResult,
  ])

  // Helper functions for cleaner code organization
  const parseWorkflowSafely = (content: string) => {
    try {
      return JSON.parse(content)
    } catch {
      throw new Error("Invalid JSON format in current workflow")
    }
  }

  const generateOptimizedWorkflow = async (
    currentWorkflow: any,
    userFeedback: string
  ) => {
    const response = await fetch("/api/workflow/formalize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: userFeedback,
        options: {
          workflowConfig: currentWorkflow,
          workflowGoal: userFeedback,
          verifyWorkflow: "none", // Skip verification for instant feedback
          repairWorkflowAfterGeneration: false,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to generate optimized workflow")
    }

    return result.data
  }

  const applyOptimizedWorkflow = (optimizedWorkflow: any) => {
    const formattedJson = JSON.stringify(optimizedWorkflow, null, 2)
    updateWorkflowJSON(formattedJson)
    setIsDirty(true)
    setFeedback("")
    setVerificationResult(null)
  }

  const handleOptimizationError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown optimization error"
    setOptimizeError(`Optimization Error: ${errorMessage}`)
  }

  const handleSave = useCallback(async () => {
    if (!commitMessage.trim()) return

    setIsLoading(true)
    setSaveError(null)

    try {
      const parsedWorkflow = parseWorkflowSafely(workflowJSON)

      // Save workflow to database
      const workflowId = `wf_id_${genShortId()}`
      await ensureWorkflowExists(commitMessage, workflowId)
      const newWorkflowVersion = await saveWorkflowVersion({
        dsl: parsedWorkflow,
        commitMessage,
        workflowId,
        parentId: workflowVersion?.wf_version_id,
        iterationBudget: workflowVersion?.iteration_budget || 50,
        timeBudgetSeconds: workflowVersion?.time_budget_seconds || 3600,
      })

      // Navigate to saved workflow
      setIsDirty(false)
      setShowSaveModal(false)
      setCommitMessage("")
      router.push(`/edit/${newWorkflowVersion.wf_version_id}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save workflow"
      setSaveError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [workflowJSON, commitMessage, workflowVersion, router])

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input/textarea (except for save/verify)
      const isInInput = ['INPUT', 'TEXTAREA'].includes((e.target as Element)?.tagName)
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault()
            if (isDirty && !isLoading && !jsonParseError) {
              setShowSaveModal(true)
            }
            break
          case "Enter":
            if (e.shiftKey && !isVerifying && !jsonParseError) {
              e.preventDefault()
              handleVerify()
            }
            break
          case "k":
            if (!isInInput) {
              e.preventDefault()
              document.querySelector<HTMLTextAreaElement>('[placeholder*="Tell me what you want"]')?.focus()
            }
            break
          case "d":
            if (!isInInput && workflowVersion) {
              e.preventDefault()
              // Clear local draft
              localStorage.removeItem(`workflow_draft_${workflowVersion.wf_version_id}`)
              setLastSaved(null)
            }
            break
        }
      }
      
      // Escape key handlers
      if (e.key === "Escape") {
        if (showSaveModal) {
          setShowSaveModal(false)
          setCommitMessage("")
          setSaveError(null)
        } else if (verificationResult) {
          setVerificationResult(null)
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDirty, isLoading, jsonParseError, isVerifying, showSaveModal, verificationResult, workflowVersion, handleVerify])

  // Warning before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [isDirty])

  return (
    <div className="flex h-full">
      {/* Left Panel - Editor */}
      <div className="flex-1 flex flex-col border-r border-gray-200">
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-base font-medium text-gray-900">
                    {workflowVersion
                      ? workflowVersion.commit_message || "Untitled Workflow"
                      : "New Workflow"}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                    <span>{workflowVersion?.wf_version_id || "Not saved yet"}</span>
                    {isDirty && (
                      <span className="text-amber-600 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                        Modified
                      </span>
                    )}
                    {jsonParseError && (
                      <span className="text-red-600 font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        JSON Error
                      </span>
                    )}
                    {lastSaved && autoSaveEnabled && (
                      <span className="text-green-600 font-medium flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Draft saved {formatTime(lastSaved)}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">

              {/* Run Button - Only show when saved */}
              {workflowVersion && (
                <Link
                  href={`/`}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-md hover:from-green-600 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run
                </Link>
              )}

              {/* Keyboard Shortcuts Help */}
              <div className="relative group">
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  <div className="p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Keyboard Shortcuts</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Save workflow</span>
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">⌘S</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Validate workflow</span>
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">⌘⇧Enter</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Focus AI assistant</span>
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">⌘K</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Clear draft</span>
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">⌘D</kbd>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Close modals</span>
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-700">Esc</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button with Smart State */}
              <button
                onClick={() => setShowSaveModal(true)}
                disabled={!isDirty || isLoading || !!jsonParseError}
                className={`
                  px-4 py-2 rounded-md font-medium text-sm
                  transition-all duration-200 flex items-center gap-2
                  ${isDirty && !jsonParseError
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer" 
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }
                `}
                title={
                  jsonParseError 
                    ? "Fix JSON errors before saving" 
                    : isDirty 
                    ? "Save changes (⌘S)" 
                    : "No changes to save"
                }
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {verificationResult && (
          <div
            className={`px-6 py-3 border-b transition-all duration-300 ${verificationResult.isValid ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {verificationResult.isValid ? (
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h3
                  className={`font-medium text-sm ${verificationResult.isValid ? "text-emerald-900" : "text-red-900"}`}
                >
                  {verificationResult.isValid
                    ? "Workflow validated successfully"
                    : "Validation issues found"}
                </h3>
                {!verificationResult.isValid &&
                  verificationResult.errors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {verificationResult.errors.map((error, index) => (
                        <li key={index} className="text-sm text-red-700 flex items-start gap-2">
                          <span className="text-red-400 mt-0.5">→</span>
                          <span className="leading-relaxed">{error}</span>
                        </li>
                      ))}
                    </ul>
                  )}
              </div>
              <button
                onClick={() => setVerificationResult(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <ImprovedJSONEditor
            content={workflowJSON}
            onChange={handleDslChange}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Right Panel - AI Assistant & Structure Info */}
      <div className="w-96 bg-gray-50 flex flex-col overflow-hidden">
        {/* AI Assistant Panel */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Assistant
              </h3>
              <span className="text-xs text-gray-500">
                {feedback.length > 0 ? `${feedback.length} chars` : "Ready to help"}
              </span>
            </div>

            {optimizeError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{optimizeError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="relative">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isOptimizing && feedback.trim()) {
                      e.preventDefault()
                      handleOptimize()
                    }
                  }}
                  placeholder="Tell me what you want to build or improve..."
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  {(navigator.platform.indexOf('Mac') > -1 ? "⌘" : "Ctrl")}+Enter
                </div>
              </div>

              <button
                onClick={handleOptimize}
                disabled={isOptimizing || !feedback.trim()}
                className={`
                  w-full px-4 py-2.5 rounded-lg font-medium text-sm
                  transition-all duration-200 flex items-center justify-center gap-2
                  ${feedback.trim() && !isOptimizing
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-sm cursor-pointer" 
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }
                `}
              >
                {isOptimizing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    Generating workflow...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate with AI
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Collapsible System Prompt */}
        <div className="bg-white border-b border-gray-200">
          <button
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <span className="text-sm font-medium text-gray-700">AI System Prompt</span>
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showSystemPrompt ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {showSystemPrompt && (
            <div className="px-6 pb-4">
              <textarea
                value={createWorkflowPrompt}
                readOnly
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-md font-mono text-gray-600"
                rows={6}
              />
            </div>
          )}
        </div>

        {/* Workflow Formatting & Validation */}
        <div className="flex-1 bg-white overflow-y-auto">
          <div className="px-6 py-4">
            <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Format & Validate
            </h3>

            <div className="space-y-4">
              {/* Format & Validate Actions */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    try {
                      const parsed = JSON.parse(workflowJSON)
                      const formatted = JSON.stringify(parsed, null, 2)
                      updateWorkflowJSON(formatted)
                    } catch {
                      // Invalid JSON, do nothing
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-medium transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Format JSON
                </button>

                <button
                  onClick={handleVerify}
                  disabled={isVerifying || !!jsonParseError}
                  className={`
                    w-full px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2
                    ${jsonParseError
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : isVerifying
                      ? "bg-purple-50 text-purple-700 border border-purple-200"
                      : "bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 cursor-pointer"
                    }
                  `}
                >
                  {isVerifying ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Validating...
                    </>
                  ) : jsonParseError ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Fix JSON First
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Validate Workflow
                    </>
                  )}
                </button>
              </div>

              {/* JSON Status */}
              <div className={`p-3 rounded-lg border ${jsonParseError ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center gap-2">
                  {jsonParseError ? (
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span className={`text-sm font-medium ${jsonParseError ? 'text-red-800' : 'text-green-800'}`}>
                    {jsonParseError ? 'Invalid JSON' : 'Valid JSON'}
                  </span>
                </div>
                {jsonParseError && (
                  <p className="text-xs text-red-600 mt-1">{jsonParseError}</p>
                )}
              </div>

              {/* Workflow Validation Status - READ ONLY */}
              {verificationResult && (
                <div className={`p-3 rounded-lg border-2 border-dashed ${verificationResult.isValid ? 'bg-emerald-50 border-emerald-300' : 'bg-orange-50 border-orange-300'}`}>
                  <div className="flex items-center gap-2">
                    {verificationResult.isValid ? (
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span className={`text-sm font-medium ${verificationResult.isValid ? 'text-emerald-800' : 'text-orange-800'}`}>
                      {verificationResult.isValid ? 'Workflow Ready' : `${verificationResult.errors.length} Issues Found`}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">Status</span>
                  </div>
                  {!verificationResult.isValid && (
                    <ul className="mt-2 space-y-1">
                      {verificationResult.errors.slice(0, 3).map((error, index) => (
                        <li key={index} className="text-xs text-orange-700">• {error}</li>
                      ))}
                      {verificationResult.errors.length > 3 && (
                        <li className="text-xs text-orange-600">+ {verificationResult.errors.length - 3} more issues</li>
                      )}
                    </ul>
                  )}
                </div>
              )}

              {/* Workflow Templates */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Start Templates</h4>
                <div className="space-y-2">
                  {WORKFLOW_TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        updateWorkflowJSON(JSON.stringify(template.workflow, null, 2))
                        setIsDirty(true)
                      }}
                      className="w-full px-3 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-left transition-colors cursor-pointer"
                    >
                      <div className="text-sm font-medium text-gray-900">{template.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{template.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal - Improved UX */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-2xl transform transition-all">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
                  </svg>
                  Save Workflow Version
                </h3>
                <button
                  onClick={() => {
                    setShowSaveModal(false)
                    setCommitMessage("")
                    setSaveError(null)
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              {saveError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-red-700 text-sm">{saveError}</div>
                </div>
              )}

              <div>
                <label
                  htmlFor="commitMessage"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  What changes did you make?
                </label>
                <textarea
                  id="commitMessage"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && commitMessage.trim() && !isLoading) {
                      e.preventDefault()
                      handleSave()
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="e.g., Added error handling to data processor node"
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">
                  {commitMessage.length > 0 ? `${commitMessage.length} characters` : "Write a brief description of your changes"}
                </p>
              </div>

              {/* Quick commit suggestions */}
              {commitMessage.length === 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-2">Quick options:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Initial workflow setup",
                      "Added new processing node",
                      "Fixed validation errors",
                      "Updated node connections",
                      "Improved error handling"
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setCommitMessage(suggestion)}
                        className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {(navigator.platform.indexOf('Mac') > -1 ? "⌘" : "Ctrl")}+Enter to save
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowSaveModal(false)
                      setCommitMessage("")
                      setSaveError(null)
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!commitMessage.trim() || isLoading}
                    className={`
                      px-6 py-2 rounded-md text-sm font-medium
                      transition-all duration-200 flex items-center gap-2
                      ${commitMessage.trim() && !isLoading
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm cursor-pointer" 
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      }
                    `}
                  >
                    {isLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Version
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
