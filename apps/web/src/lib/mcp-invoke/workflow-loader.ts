import { logException } from "@/lib/error-logger"
import { createRLSClient } from "@/lib/supabase/server-rls"
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
 * Workflow ID mode for strict validation
 * - "workflow_version": Expects a specific version ID (wf_ver_*)
 * - "workflow_parent": Expects a parent workflow ID (wf_*), resolves to latest version
 */
export type WorkflowIdMode = "workflow_version" | "workflow_parent"

/**
 * Loads workflow configuration with support for both workflow IDs (wf_*) and version IDs (wf_ver_*)
 *
 * @param workflowId - Either a workflow ID (wf_*) or version ID (wf_ver_*)
 * @param mode - Optional: Enforce specific ID type to prevent mistakes
 *   - "workflow_version": Expects wf_ver_* (specific version)
 *   - "workflow_parent": Expects wf_* (parent workflow, resolves to latest)
 *   - undefined: Auto-detect (less safe, not recommended)
 * @returns WorkflowLoadResult with config and schemas
 *
 * @example
 * // Load latest version of a workflow parent
 * await loadWorkflowConfig("wf_research_paper", "workflow_parent")
 *
 * @example
 * // Load specific version
 * await loadWorkflowConfig("wf_ver_abc123", "workflow_version")
 *
 * @example
 * // Auto-detect ID type (not recommended - use mode parameter)
 * await loadWorkflowConfig("wf_research_paper")
 */
export async function loadWorkflowConfig(workflowId: string, mode?: WorkflowIdMode): Promise<WorkflowLoadResult> {
  try {
    const isVersionId = workflowId.startsWith("wf_ver_")
    const isWorkflowId = workflowId.startsWith("wf_") && !isVersionId

    // Mode validation
    if (mode === "workflow_version" && !isVersionId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.WORKFLOW_NOT_FOUND,
          message: `Expected workflow version ID (wf_ver_*), but got: ${workflowId}`,
        },
      }
    }

    if (mode === "workflow_parent" && !isWorkflowId) {
      return {
        success: false,
        error: {
          code: ErrorCodes.WORKFLOW_NOT_FOUND,
          message: `Expected workflow parent ID (wf_*), but got: ${workflowId}`,
        },
      }
    }

    // Handle version ID - direct lookup
    if (isVersionId) {
      return await loadWorkflowByVersionId(workflowId)
    }

    // Handle workflow ID - resolve to latest version
    if (isWorkflowId) {
      return await loadWorkflowByWorkflowId(workflowId)
    }

    // Neither format recognized
    return {
      success: false,
      error: {
        code: ErrorCodes.WORKFLOW_NOT_FOUND,
        message: `Invalid workflow ID format: ${workflowId}. Expected wf_* or wf_ver_*`,
      },
    }
  } catch (error) {
    logException(error, {
      location: "/lib/mcp-invoke/workflow-loader",
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

/**
 * Load workflow by version ID (wf_ver_*)
 */
async function loadWorkflowByVersionId(versionId: string): Promise<WorkflowLoadResult> {
  const supabase = await createRLSClient()

  const { data, error } = await supabase
    .from("WorkflowVersion")
    .select("*")
    .eq("wf_version_id", versionId)
    .maybeSingle()

  if (error || !data) {
    return {
      success: false,
      error: {
        code: ErrorCodes.WORKFLOW_NOT_FOUND,
        message: `Workflow version ${versionId} not found`,
      },
    }
  }

  const config: WorkflowConfig = data.dsl as unknown as WorkflowConfig

  return {
    success: true,
    config,
    inputSchema: config.inputSchema,
  }
}

/**
 * Load workflow by workflow ID (wf_*) - resolves to latest version
 */
async function loadWorkflowByWorkflowId(workflowId: string): Promise<WorkflowLoadResult> {
  const supabase = await createRLSClient()

  // Query workflow with its versions (RLS enforced)
  const { data, error } = await supabase
    .from("Workflow")
    .select(
      `
      wf_id,
      versions:WorkflowVersion(
        wf_version_id,
        dsl,
        created_at
      )
    `,
    )
    .eq("wf_id", workflowId)
    .maybeSingle()

  if (error || !data) {
    return {
      success: false,
      error: {
        code: ErrorCodes.WORKFLOW_NOT_FOUND,
        message: `Workflow ${workflowId} not found`,
      },
    }
  }

  if (!data.versions || data.versions.length === 0) {
    return {
      success: false,
      error: {
        code: ErrorCodes.WORKFLOW_NOT_FOUND,
        message: `No versions found for workflow ${workflowId}`,
      },
    }
  }

  // Get latest version by created_at
  const latestVersion = data.versions.sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )[0]

  const config: WorkflowConfig = latestVersion.dsl as unknown as WorkflowConfig

  return {
    success: true,
    config,
    inputSchema: config.inputSchema,
  }
}
