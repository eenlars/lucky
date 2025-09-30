import { supabase } from "@core/utils/clients/supabase/client"
import { genShortId } from "@core/utils/common/utils"
import { envi } from "@core/utils/env.mjs"
import { lgg } from "@core/utils/logging/Logger"
import { createWorkflowVersion, ensureWorkflowExists } from "@core/utils/persistence/workflow/registerWorkflow"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { workflowConfigHandler } from "@core/workflow/setup/WorkflowLoader"
import { getDefaultModels, PATHS } from "@core/core-config/compat"

/**
 * Decide whether to use database-backed storage for live workflow config.
 * Defaults to DB in production, file locally.
 */
export function useDbForLiveConfig(): boolean {
  const mode = envi.CONFIG_STORAGE_MODE
  if (mode === "db") return true
  if (mode === "file") return false
  return envi.NODE_ENV === "production"
}

function makeDefaultConfig(): WorkflowConfig {
  return {
    entryNodeId: "main",
    nodes: [
      {
        nodeId: "main",
        description: "Main workflow node",
        systemPrompt: "You are a helpful assistant. Complete the task as requested.",
        modelName: getDefaultModels().default,
        mcpTools: [],
        codeTools: [],
        handOffs: ["end"],
        memory: {},
      },
    ],
  }
}

/**
 * Load the live workflow configuration using the selected backend.
 * - File mode: loads from PATHS.setupFile (creating it if missing).
 * - DB mode: loads from a fixed WorkflowVersion row; falls back to latest.
 */
export async function loadLiveWorkflowConfig(
  fileName: string = PATHS.setupFile,
  opts?: { wfVersionId?: string; workflowId?: string },
): Promise<WorkflowConfig> {
  if (!useDbForLiveConfig()) {
    return workflowConfigHandler.loadSingleWorkflow(fileName)
  }

  // DB mode
  // 1) Specific workflow version
  if (opts?.wfVersionId) {
    const { data, error } = await supabase
      .from("WorkflowVersion")
      .select("dsl")
      .eq("wf_version_id", opts.wfVersionId)
      .single()
    if (error) throw new Error(`Workflow version not found: ${error.message}`)
    return data.dsl as unknown as WorkflowConfig
  }

  // 2) Latest version for a workflow
  if (opts?.workflowId) {
    const { data, error } = await supabase
      .from("WorkflowVersion")
      .select("dsl")
      .eq("workflow_id", opts.workflowId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw new Error(`Failed to load workflow: ${error.message}`)
    if (data?.dsl) return data.dsl as unknown as WorkflowConfig
    return makeDefaultConfig()
  }

  // 3) Latest version across all workflows
  const { data: latest, error: latestErr } = await supabase
    .from("WorkflowVersion")
    .select("dsl")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (latestErr) throw new Error(`Failed to load latest workflow: ${latestErr.message}`)
  if (latest?.dsl) return latest.dsl as unknown as WorkflowConfig
  return makeDefaultConfig()
}

/**
 * Save the live workflow configuration using the selected backend.
 * - File mode: saves to setup folder and optional backup file.
 * - DB mode: upserts a fixed WorkflowVersion row; optional timestamped backup rows.
 */
export async function saveLiveWorkflowConfig(
  config: WorkflowConfig,
  options?: {
    fileName?: string
    skipBackup?: boolean
    workflowId?: string
    commitMessage?: string
    parentVersionId?: string
    iterationBudget?: number
    timeBudgetSeconds?: number
  },
): Promise<{ wfVersionId?: string; workflowId?: string }> {
  if (!useDbForLiveConfig()) {
    await workflowConfigHandler.saveWorkflowConfig(
      config,
      options?.fileName || "setupfile.json",
      options?.skipBackup ?? false,
    )
    return {}
  }

  // DB mode: create a new workflow version (no env-based IDs)
  const workflowId = options?.workflowId || `wf_${genShortId()}`
  const commitMessage = options?.commitMessage || "Updated via API"
  const parentId = options?.parentVersionId
  const iterationBudget = options?.iterationBudget ?? 50
  const timeBudgetSeconds = options?.timeBudgetSeconds ?? 3600

  await ensureWorkflowExists(commitMessage, workflowId)

  const wfVersionId = `wfv_${genShortId()}`
  await createWorkflowVersion({
    workflowVersionId: wfVersionId,
    workflowConfig: config,
    commitMessage,
    workflowId,
    operation: parentId ? "mutation" : "init",
    parent1Id: parentId,
    generation: undefined,
  })

  lgg.log("✅ Saved live workflow configuration to database", {
    wf_version_id: wfVersionId,
    workflow_id: workflowId,
  })

  return { wfVersionId, workflowId }
}
