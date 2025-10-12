import { logException } from "@/lib/error-logger"
import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import type { JsonSchemaDefinition, WorkflowConfig } from "@lucky/shared/contracts/workflow"

/**
 * Result of workflow config loading
 */
export interface WorkflowLoadResult {
  success: boolean
  config?: WorkflowConfig
  inputSchema?: JsonSchemaDefinition
  error?: {
    code: number
    message: string
  }
}

/**
 * Loads workflow configuration by version ID
 * Returns the workflow config and its input schema (if defined)
 */
export async function loadWorkflowConfig(workflowVersionId: string): Promise<WorkflowLoadResult> {
  try {
    // Call the existing workflow config API
    const response = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/workflow/version/${workflowVersionId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    )

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: {
            code: ErrorCodes.WORKFLOW_NOT_FOUND,
            message: `Workflow ${workflowVersionId} not found`,
          },
        }
      }

      return {
        success: false,
        error: {
          code: ErrorCodes.INTERNAL_ERROR,
          message: "Failed to load workflow configuration",
        },
      }
    }

    const data = await response.json()
    const config: WorkflowConfig = data.config || data

    return {
      success: true,
      config,
      inputSchema: config.inputSchema,
    }
  } catch (error) {
    logException(error, {
      location: "/lib/mcp-invoke/workflow-loader",
      env: typeof window !== "undefined" && window.location.hostname === "localhost" ? "development" : "production",
    })
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : "Failed to load workflow",
      },
    }
  }
}
