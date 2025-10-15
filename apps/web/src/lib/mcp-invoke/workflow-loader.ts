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
  source?: "version" | "parent" | "demo"
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
const DEMO_WORKFLOW: WorkflowConfig = {
  __schema_version: 1,
  entryNodeId: "assistant",
  nodes: [
    {
      nodeId: "assistant",
      description: "A helpful AI assistant that responds to your questions",
      modelName: "openrouter#openai/gpt-4o-mini",
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
    source: "demo",
  }
}

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
export async function loadWorkflowConfig(
  workflowId: string,
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
      const result = await loadWorkflowByVersionId(workflowId)
      if (!result.success && options?.returnDemoOnNotFound) {
        console.log(`[workflow-loader] Workflow ${workflowId} not found, returning demo workflow`)
        return getDemoWorkflow()
      }
      return result
    }

    // Handle workflow ID - resolve to latest version
    if (isWorkflowId) {
      const result = await loadWorkflowByWorkflowId(workflowId)
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
    outputSchema: config.outputSchema,
    resolvedWorkflowVersionId: versionId,
    source: "version",
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
    outputSchema: config.outputSchema,
    resolvedWorkflowVersionId: latestVersion.wf_version_id,
    source: "parent",
  }
}
