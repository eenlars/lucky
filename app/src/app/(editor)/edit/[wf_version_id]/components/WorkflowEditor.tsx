"use client"

import { saveWorkflowVersion } from "@/trace-visualization/db/Workflow/retrieveWorkflow"
import { loadFromDSL } from "@core/workflow/setup/WorkflowLoader"
import type { Tables } from "@lucky/shared"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
// Removed server action import - using API route instead
import ActionBar from "./ActionBar"
import DSLEditor from "./DSLEditor"
import ResultsPanel from "./ResultsPanel"

interface WorkflowEditorProps {
  workflowVersion: Tables<"WorkflowVersion">
}

export default function WorkflowEditor({
  workflowVersion,
}: WorkflowEditorProps) {
  const router = useRouter()
  const [dslContent, setDslContent] = useState(
    JSON.stringify(workflowVersion.dsl, null, 2)
  )
  const [isDirty, setIsDirty] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [executionResults, setExecutionResults] = useState<any>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const [_showUnsavedWarning, _setShowUnsavedWarning] = useState(false)

  const handleDslChange = (newContent: string) => {
    setDslContent(newContent)
    setIsDirty(true)
  }

  const handleSave = async (commitMessage: string) => {
    setIsLoading(true)
    setSaveError(null)

    try {
      // Parse and validate DSL content
      const parsedDsl = JSON.parse(dslContent)
      const validatedConfig = await loadFromDSL(parsedDsl)

      // Save new workflow version
      const newWorkflowVersion = await saveWorkflowVersion({
        dsl: validatedConfig,
        commitMessage,
        workflowId: workflowVersion.workflow_id,
        parentId: workflowVersion.wf_version_id,
        iterationBudget: workflowVersion.iteration_budget,
        timeBudgetSeconds: workflowVersion.time_budget_seconds,
      })

      setIsDirty(false)

      // Navigate to the new workflow version
      router.push(`/edit/${newWorkflowVersion.wf_version_id}`)
    } catch (error) {
      console.error("Failed to save workflow:", error)
      setSaveError(
        error instanceof Error ? error.message : "Failed to save workflow"
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleRun = useCallback(async () => {
    setIsLoading(true)
    setRunError(null)
    setExecutionResults(null)

    try {
      // Parse and validate DSL content
      const parsedDsl = JSON.parse(dslContent)
      const validatedConfig = await loadFromDSL(parsedDsl)

      // Run the workflow via API route
      const response = await fetch("/api/workflow/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dslConfig: validatedConfig,
          workflowId: workflowVersion.workflow_id,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        setExecutionResults({
          success: true,
          data: result.data,
          usdCost: result.usdCost,
          message: "Workflow executed successfully",
        })
      } else {
        setRunError(result.error || "Workflow execution failed")
      }
    } catch (error) {
      console.error("Failed to run workflow:", error)
      setRunError(
        error instanceof Error ? error.message : "Failed to run workflow"
      )
    } finally {
      setIsLoading(false)
    }
  }, [dslContent, workflowVersion.workflow_id])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "s") {
          e.preventDefault()
          if (isDirty && !isLoading) {
            // Trigger save modal
            const saveButton = document.querySelector(
              "[data-save-button]"
            ) as HTMLButtonElement
            if (saveButton) {
              saveButton.click()
            }
          }
        } else if (e.key === "r") {
          e.preventDefault()
          if (!isLoading) {
            handleRun()
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isDirty, isLoading, handleRun])

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
    <div className="flex h-full bg-gray-50">
      {/* Left Panel - Editor */}
      <div className="flex-1 flex flex-col border-r border-gray-200">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Version: {workflowVersion.wf_version_id}
                {isDirty && (
                  <span className="text-orange-600 ml-2">
                    • Unsaved changes
                  </span>
                )}
              </p>
            </div>
            <ActionBar
              onSave={handleSave}
              onRun={handleRun}
              isDirty={isDirty}
              isLoading={isLoading}
              saveError={saveError}
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <DSLEditor
            content={dslContent}
            onChange={handleDslChange}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Right Panel - Results */}
      <div className="w-1/3 bg-white">
        <ResultsPanel results={executionResults} error={runError} />
      </div>
    </div>
  )
}
