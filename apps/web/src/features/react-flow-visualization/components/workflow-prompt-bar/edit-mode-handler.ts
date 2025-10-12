import { logException } from "@/lib/error-logger"
import type { WorkflowConfig } from "@lucky/core/workflow/schema/workflow.types"

/**
 * Result from edit mode handler
 */
export interface EditModeResult {
  success: boolean
  error?: string
  workflowConfig?: WorkflowConfig
}

/**
 * Edit Mode Handler: AI-powered workflow modification.
 *
 * Takes a natural language prompt and modifies the workflow structure
 * using the formalize API. This mode changes the graph itself (adds/removes/modifies nodes).
 *
 * @param prompt - Natural language description of desired changes
 * @param exportToJSON - Function to export current workflow as JSON
 * @param onProgress - Optional callback for progress logging
 * @returns Result containing the updated workflow configuration
 */
export async function executeEditMode(
  prompt: string,
  exportToJSON: () => string,
  onProgress?: (log: string) => void,
): Promise<EditModeResult> {
  try {
    onProgress?.("Exporting current workflow...")
    const currentWorkflowJson = exportToJSON()
    const currentWorkflow = JSON.parse(currentWorkflowJson)

    onProgress?.("Sending modification request to AI...")
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

    onProgress?.("Processing AI response...")
    const result = await response.json()

    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to update workflow")
    }

    onProgress?.("✅ Workflow updated successfully")
    return {
      success: true,
      workflowConfig: result.data,
    }
  } catch (error) {
    logException(error, {
      location: typeof window !== "undefined" ? window.location.pathname : "unknown",
      env: typeof window !== "undefined" && window.location.hostname === "localhost" ? "development" : "production",
    })
    const errorMessage = error instanceof Error ? error.message : "Failed to update workflow"
    onProgress?.(`❌ Error: ${errorMessage}`)
    return {
      success: false,
      error: errorMessage,
    }
  }
}
