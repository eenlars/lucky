"use client"

// Using API route instead of server actions
import { showToast } from "@/lib/toast-utils"
import { useAppStore } from "@/react-flow-visualization/store"
import { genShortId } from "@core/utils/common/utils"
import type { Tables } from "@lucky/shared"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import ImprovedJSONEditor from "../[wf_version_id]/components/ImprovedJSONEditor"
import AssistantPanel from "./json-editor/AssistantPanel"
import EditorHeader from "./json-editor/EditorHeader"
import FormatValidatePanel from "./json-editor/FormatValidatePanel"
import SaveModal from "./json-editor/SaveModal"
import SystemPromptPanel from "./json-editor/SystemPromptPanel"
import VerificationBanner from "./json-editor/VerificationBanner"

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
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizeError, setOptimizeError] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [_autoSaveEnabled, _setAutoSaveEnabled] = useState(true)
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
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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

  // Auto-save functionality with debounce (10s)
  useEffect(() => {
    if (!isDirty || !_autoSaveEnabled || !workflowVersion) return

    const autoSaveTimeout = setTimeout(() => {
      // Only auto-save if JSON is valid
      if (!jsonParseError) {
        localStorage.setItem(
          `workflow_draft_${workflowVersion.wf_version_id}`,
          workflowJSON
        )
        setLastSaved(new Date())
      }
    }, 10000)

    return () => clearTimeout(autoSaveTimeout)
  }, [workflowJSON, isDirty, _autoSaveEnabled, workflowVersion, jsonParseError])

  // Load draft on mount
  const hasRestoredDraftRef = useRef(false)
  useEffect(() => {
    if (!workflowVersion?.wf_version_id || hasRestoredDraftRef.current) return

    const draft = localStorage.getItem(
      `workflow_draft_${workflowVersion.wf_version_id}`
    )
    if (draft) {
      updateWorkflowJSON(draft)
      setIsDirty(true)
    }
    hasRestoredDraftRef.current = true
  }, [workflowVersion?.wf_version_id, updateWorkflowJSON])

  const handleVerify = useCallback(async () => {
    setIsVerifying(true)
    setVerificationResult(null)

    try {
      const workflow = parseWorkflowSafely(workflowJSON)
      const verificationResult = await verifyWorkflowWithAPI(workflow)
      setVerificationResult(verificationResult)
      if (!verificationResult.isValid) {
        showToast.error.validation(
          `Validation failed: ${verificationResult.errors[0]}`
        )
      }
    } catch (error) {
      const errorResult = createErrorResult(error)
      setVerificationResult(errorResult)
      showToast.error.validation(errorResult.errors[0])
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

  const applyOptimizedWorkflow = useCallback(
    (optimizedWorkflow: any) => {
      const formattedJson = JSON.stringify(optimizedWorkflow, null, 2)
      updateWorkflowJSON(formattedJson)
      setIsDirty(true)
      setFeedback("")
      setVerificationResult(null)
    },
    [updateWorkflowJSON]
  )

  const handleOptimize = useCallback(async () => {
    if (!feedback.trim()) {
      showToast.error.validation("Please provide feedback before optimizing")
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
  }, [workflowJSON, feedback, applyOptimizedWorkflow])

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

  const handleOptimizationError = (error: unknown) => {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown optimization error"
    setOptimizeError(`Optimization Error: ${errorMessage}`)
    showToast.error.generic(errorMessage)
  }

  const handleSave = useCallback(async () => {
    if (!commitMessage.trim()) return

    setIsLoading(true)
    setSaveError(null)

    try {
      const parsedWorkflow = parseWorkflowSafely(workflowJSON)

      // Save workflow via API route
      const workflowId = `wf_id_${genShortId()}`
      const response = await fetch("/api/workflow/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dsl: parsedWorkflow,
          commitMessage,
          workflowId,
          parentId: workflowVersion?.wf_version_id,
          iterationBudget: workflowVersion?.iteration_budget || 50,
          timeBudgetSeconds: workflowVersion?.time_budget_seconds || 3600,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(
          errorData.error || `HTTP error! status: ${response.status}`
        )
      }

      const result = await response.json()
      const newWorkflowVersion = result.data

      // Navigate to saved workflow
      setIsDirty(false)
      setShowSaveModal(false)
      setCommitMessage("")
      showToast.success.save("Workflow saved successfully")
      router.push(`/edit/${newWorkflowVersion.wf_version_id}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save workflow"
      setSaveError(errorMessage)
      showToast.error.save(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [workflowJSON, commitMessage, workflowVersion, router])

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input/textarea (except for save/verify)
      const isInInput = ["INPUT", "TEXTAREA"].includes(
        (e.target as Element)?.tagName
      )

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault()
            if (isDirty && !isLoading && !jsonParseError) {
              setShowSaveModal(true)
            }
            break
          case "k":
            if (!isInInput) {
              e.preventDefault()
              document
                .querySelector<HTMLTextAreaElement>(
                  '[placeholder*="Tell me what you want"]'
                )
                ?.focus()
            }
            break
          case "d":
            if (!isInInput && workflowVersion) {
              e.preventDefault()
              // Clear local draft
              localStorage.removeItem(
                `workflow_draft_${workflowVersion.wf_version_id}`
              )
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
  }, [
    isDirty,
    isLoading,
    jsonParseError,
    isVerifying,
    showSaveModal,
    verificationResult,
    workflowVersion,
    handleVerify,
  ])

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
        <EditorHeader
          workflowVersion={workflowVersion}
          isDirty={isDirty}
          isLoading={isLoading}
          jsonParseError={jsonParseError}
          lastSaved={lastSaved}
          autoSaveEnabled={_autoSaveEnabled}
          formatTime={formatTime}
          onOpenSaveModal={() => setShowSaveModal(true)}
        />

        <VerificationBanner
          verificationResult={verificationResult}
          onClose={() => setVerificationResult(null)}
        />

        <div className="flex-1 overflow-hidden">
          <ImprovedJSONEditor
            content={workflowJSON}
            onChange={handleDslChange}
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="w-96 bg-gray-50 flex flex-col overflow-hidden">
        <AssistantPanel
          feedback={feedback}
          setFeedback={setFeedback}
          isOptimizing={isOptimizing}
          optimizeError={optimizeError}
          onOptimize={handleOptimize}
        />

        {/* Collapsible System Prompt */}
        <SystemPromptPanel />

        {/* Workflow Formatting & Validation */}
        <FormatValidatePanel
          workflowJSON={workflowJSON}
          jsonParseError={jsonParseError}
          updateWorkflowJSON={updateWorkflowJSON}
          setIsDirty={setIsDirty}
          isVerifying={isVerifying}
          onVerify={handleVerify}
          verificationResult={verificationResult}
        />
      </div>

      <SaveModal
        open={showSaveModal}
        onClose={() => {
          setShowSaveModal(false)
          setCommitMessage("")
          setSaveError(null)
        }}
        commitMessage={commitMessage}
        setCommitMessage={setCommitMessage}
        isLoading={isLoading}
        onSave={handleSave}
        saveError={saveError}
      />
    </div>
  )
}
