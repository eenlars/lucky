"use client"

import { showToast } from "@/lib/toast-utils"
import type { Tables } from "@lucky/shared/client"
import { genShortId } from "@lucky/shared/client"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"

interface UseWorkflowSaveOptions {
  workflowVersion?: Tables<"WorkflowVersion">
  onSuccess?: (newVersionId: string) => void
}

export function useWorkflowSave({ workflowVersion, onSuccess }: UseWorkflowSaveOptions = {}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useCallback(
    async (workflowData: any, commitMessage: string) => {
      if (!commitMessage.trim()) {
        throw new Error("Commit message is required")
      }

      setIsLoading(true)
      setError(null)

      try {
        // Save workflow via API route
        const workflowId = workflowVersion?.workflow_id || `wf_id_${genShortId()}`
        const response = await fetch("/api/workflow/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dsl: workflowData,
            commitMessage,
            workflowId,
            parentId: workflowVersion?.wf_version_id,
            iterationBudget: workflowVersion?.iteration_budget || 50,
            timeBudgetSeconds: workflowVersion?.time_budget_seconds || 3600,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        const result = await response.json()
        const newWorkflowVersion = result.data

        showToast.success.save("Workflow saved successfully")

        if (onSuccess) {
          onSuccess(newWorkflowVersion.wf_version_id)
        } else {
          // Default behavior: navigate to the new version
          router.push(`/edit/${newWorkflowVersion.wf_version_id}`)
        }

        return newWorkflowVersion
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to save workflow"
        setError(errorMessage)
        showToast.error.save(errorMessage)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [workflowVersion, router, onSuccess],
  )

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return {
    save,
    isLoading,
    error,
    reset,
  }
}
