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
    onContentChange?.(newContent)
  }

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "s") {
          e.preventDefault()
          if (isDirty && !isLoading) {
            setShowSaveModal(true)
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDirty, isLoading])

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
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-gray-600">
                    {workflowVersion
                      ? `Editing: ${workflowVersion.wf_version_id}`
                      : "Creating new workflow"}
                    {isDirty && (
                      <span className="text-orange-600 ml-2">
                        • Unsaved changes
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleVerify}
                disabled={isVerifying}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </button>

              {workflowVersion && (
                <Link
                  href={`/`}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                >
                  <span>▶️</span>
                  Run
                </Link>
              )}

              <button
                onClick={() => setShowSaveModal(true)}
                disabled={!isDirty || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </div>
        </div>

        {verificationResult && (
          <div
            className={`p-4 border-b ${verificationResult.isValid ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${verificationResult.isValid ? "bg-green-500" : "bg-red-500"}`}
              ></div>
              <span
                className={`font-medium ${verificationResult.isValid ? "text-green-800" : "text-red-800"}`}
              >
                {verificationResult.isValid
                  ? "Workflow is valid"
                  : "Workflow validation failed"}
              </span>
            </div>
            {!verificationResult.isValid &&
              verificationResult.errors.length > 0 && (
                <div className="mt-2">
                  <ul className="text-sm text-red-700 space-y-1">
                    {verificationResult.errors.map((error, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span>{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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

      {/* Right Panel - JSON Structure Info & Feedback */}
      <div className="w-80 bg-white flex flex-col overflow-hidden">
        {/* Feedback Panel */}
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">Feedback</h3>

          {optimizeError && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {optimizeError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isOptimizing && feedback.trim()) {
                    e.preventDefault()
                    handleOptimize()
                  }
                }}
                placeholder="Describe what you want to improve in the JSON structure..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <button
              onClick={handleOptimize}
              disabled={isOptimizing || !feedback.trim()}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isOptimizing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </div>

        {/* System Prompt Panel */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50"
          >
            <span className="font-medium text-gray-900">System Prompt</span>
            <svg
              className={`w-4 h-4 transition-transform ${showSystemPrompt ? "rotate-180" : ""}`}
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
            <div className="px-4 pb-4">
              <textarea
                value={createWorkflowPrompt}
                readOnly
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-300 rounded font-mono"
                rows={8}
              />
            </div>
          )}
        </div>

        {/* JSON Structure Info */}
        <div className="flex-1 p-4 overflow-y-auto">
          <h3 className="font-medium text-gray-900 mb-4">JSON Structure</h3>

          <div className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                Required Fields
              </h4>
              <ul className="space-y-1 text-gray-600">
                <li>
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    nodes
                  </code>{" "}
                  - Array of workflow nodes
                </li>
                <li>
                  <code className="text-xs bg-gray-100 px-1 rounded">
                    edges
                  </code>{" "}
                  - Array of connections
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">Node Structure</h4>
              <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                {`{
  "nodeId": "string",
  "systemPrompt": "string",
  "tools": ["tool1", "tool2"],
  "handoffs": ["nodeId1"],
  "model": "string"
}`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Save Workflow Version
            </h3>

            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="text-red-700 text-sm">{saveError}</div>
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="commitMessage"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Commit Message
              </label>
              <textarea
                id="commitMessage"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe your changes..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setCommitMessage("")
                  setSaveError(null)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!commitMessage.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
