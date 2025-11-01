import type { Principal } from "@/lib/auth/principal"
import { fetchWorkflowVersion, fetchWorkflowWithVersions } from "@/lib/data/workflow-repository"
import { logException } from "@/lib/error-logger"
import type { InvocationSource } from "@lucky/core/workflow/runner/types"
import { ErrorCodes } from "@lucky/shared/contracts/invoke"
import type { JsonSchemaDefinition, WorkflowConfigZ } from "@lucky/shared/contracts/workflow"

/**
 * Result of workflow config loading
 */
export interface WorkflowLoadResult {
  success: boolean
  config?: WorkflowConfigZ
  inputSchema?: JsonSchemaDefinition
  outputSchema?: JsonSchemaDefinition
  /**
   * The resolved workflow version ID when loaded from the database.
   * Present when the source is a database workflow (version or latest of parent).
   */
  resolvedWorkflowVersionId?: string
  /**
   * Indicates where the workflow config was sourced from.
   * - 'version': Loaded by explicit workflow version ID (wf_ver_*)
   * - 'parent': Loaded by parent workflow ID (wf_*) and resolved to latest version
   * - 'demo': Returned built-in demo config
   */
  source?: InvocationSource
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
 * Default demo workflow for new users
 * Simple single-node workflow that responds to any input
 * Accessible via workflow ID: "wf_demo"
 */
const DEMO_WORKFLOW: WorkflowConfigZ = {
  __schema_version: 1,
  entryNodeId: "assistant",
  nodes: [
    {
      nodeId: "assistant",
      description: "A helpful AI assistant that responds to your questions",
      gatewayModelId: "openai/gpt-4o-mini",
      gateway: "openai-api",
      mcpTools: [],
      codeTools: [],
      systemPrompt:
        "You are a helpful AI assistant. Answer the user's question clearly and concisely. If they're asking about this workflow system, explain that this is a demo workflow and they can create their own custom multi-agent workflows by visiting the workflow builder.",
      handOffs: ["end"],
      memory: {},
    },
  ],
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "Your question or prompt",
      },
    },
    required: ["question"],
  },
  outputSchema: {
    type: "object",
    properties: {
      response: {
        type: "string",
        description: "The assistant's response",
      },
    },
  },
}

/**
 * Get the demo workflow configuration
 * @returns Demo workflow for new users
 */
export function getDemoWorkflow(): WorkflowLoadResult {
  return {
    success: true,
    config: DEMO_WORKFLOW,
    inputSchema: DEMO_WORKFLOW.inputSchema,
    outputSchema: DEMO_WORKFLOW.outputSchema,
    source: { kind: "dsl", config: DEMO_WORKFLOW },
  }
}

/**
 * Loads workflow configuration with support for both workflow IDs (wf_*) and version IDs (wf_ver_*)
 *
 * @param workflowId - Either a workflow ID (wf_*) or version ID (wf_ver_*)
 * @param principal - Authenticated user principal (for access control)
 * @param mode - Optional: Enforce specific ID type to prevent mistakes
 *   - "workflow_version": Expects wf_ver_* (specific version)
 *   - "workflow_parent": Expects wf_* (parent workflow, resolves to latest)
 *   - undefined: Auto-detect (less safe, not recommended)
 * @param options - Additional options
 * @returns WorkflowLoadResult with config and schemas
 *
 * @example
 * // Load latest version of a workflow parent
 * await loadWorkflowConfig("wf_research_paper", principal, "workflow_parent")
 *
 * @example
 * // Load specific version
 * await loadWorkflowConfig("wf_ver_abc123", principal, "workflow_version")
 */
export async function loadWorkflowConfig(
  workflowId: string,
  principal?: Principal,
  mode?: WorkflowIdMode,
  options?: { returnDemoOnNotFound?: boolean },
): Promise<WorkflowLoadResult> {
  try {
    // Special case: demo workflow
    if (workflowId === "wf_demo" || workflowId === "demo") {
      console.log("[workflow-loader] Returning demo workflow")
      return getDemoWorkflow()
    }

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
      const result = await loadWorkflowByVersionId(workflowId, principal)
      if (!result.success && options?.returnDemoOnNotFound) {
        console.log(`[workflow-loader] Workflow ${workflowId} not found, returning demo workflow`)
        return getDemoWorkflow()
      }
      return result
    }

    // Handle workflow ID - resolve to latest version
    if (isWorkflowId) {
      const result = await loadWorkflowByWorkflowId(workflowId, principal)
      if (!result.success && options?.returnDemoOnNotFound) {
        console.log(`[workflow-loader] Workflow ${workflowId} not found, returning demo workflow`)
        return getDemoWorkflow()
      }
      return result
    }

    // Neither format recognized - return demo if requested
    if (options?.returnDemoOnNotFound) {
      console.log(`[workflow-loader] Invalid workflow ID ${workflowId}, returning demo workflow`)
      return getDemoWorkflow()
    }

    return {
      success: false,
      error: {
        code: ErrorCodes.WORKFLOW_NOT_FOUND,
        message: `Invalid workflow ID format: ${workflowId}. Expected wf_* or wf_ver_*`,
      },
    }
  } catch (error) {
    logException(error, {
      location: "/features/workflow-invocation/lib/database-workflow-loader",
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
async function loadWorkflowByVersionId(versionId: string, principal?: Principal): Promise<WorkflowLoadResult> {
  console.log("[workflow-loader] Loading by version ID:", versionId)

  const clientMode = principal ? principal.auth_method : "session (RLS)"
  console.log(`[workflow-loader] Using ${clientMode} access for version lookup`)

  const { data, error } = await fetchWorkflowVersion(versionId, principal)

  console.log("[workflow-loader] Version query result:", { hasData: !!data, error: error?.message })

  if (error) {
    console.log("[workflow-loader] ❌ Failed to load workflow version (repository error):", {
      versionId,
      message: error.message,
    })
    logException(error, {
      location: "/features/workflow-invocation/lib/database-workflow-loader/version",
    })
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: error.message ?? "Failed to load workflow version",
      },
    }
  }

  if (!data) {
    console.log("[workflow-loader] ❌ Workflow version not found or access denied:", versionId)
    return {
      success: false,
      error: {
        code: ErrorCodes.WORKFLOW_NOT_FOUND,
        message: `Workflow version ${versionId} not found`,
      },
    }
  }

  const config: WorkflowConfigZ = data.dsl as unknown as WorkflowConfigZ

  return {
    success: true,
    config,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    resolvedWorkflowVersionId: versionId,
    source: { kind: "version", id: versionId },
  }
}

/**
 * Load workflow by workflow ID (wf_*) - resolves to latest version
 */
async function loadWorkflowByWorkflowId(workflowId: string, principal?: Principal): Promise<WorkflowLoadResult> {
  console.log("[workflow-loader] Loading by workflow ID:", workflowId)

  const clientMode = principal ? principal.auth_method : "session (RLS)"
  console.log(`[workflow-loader] Using ${clientMode} access for workflow lookup`)

  const { data, error } = await fetchWorkflowWithVersions(workflowId, principal)

  console.log("[workflow-loader] Workflow query result:", {
    hasData: !!data,
    workflowClerkId: data?.clerk_id,
    principalClerkId: principal?.clerk_id,
    authMethod: principal?.auth_method,
    versionsCount: data?.versions?.length,
    error: error?.message,
  })

  if (error) {
    console.log("[workflow-loader] ❌ Failed to load workflow (repository error):", {
      workflowId,
      message: error.message,
    })
    logException(error, {
      location: "/features/workflow-invocation/lib/database-workflow-loader/workflow",
    })
    return {
      success: false,
      error: {
        code: ErrorCodes.INTERNAL_ERROR,
        message: error.message ?? "Failed to load workflow",
      },
    }
  }

  if (!data) {
    console.log("[workflow-loader] ❌ Workflow not found or access denied:", workflowId)
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

  const config: WorkflowConfigZ = latestVersion.dsl as unknown as WorkflowConfigZ

  return {
    success: true,
    config,
    inputSchema: config.inputSchema,
    outputSchema: config.outputSchema,
    resolvedWorkflowVersionId: latestVersion.wf_version_id,
    source: { kind: "version", id: latestVersion.wf_version_id },
  }
}
