/**
 * Workflow management utilities for client-side operations
 * Provides a clean interface for the app to interact with workflows
 */

import { nanoid } from "nanoid"
import type { Database, Json, TablesInsert } from "@lucky/shared"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { createClient } from "@/lib/supabase/client"

// Type aliases for clarity
export type Workflow = Database["public"]["Tables"]["Workflow"]["Row"]
export type WorkflowVersion =
  Database["public"]["Tables"]["WorkflowVersion"]["Row"]

// Extended types for UI
export interface WorkflowWithVersions extends Workflow {
  versions?: WorkflowVersion[]
  activeVersion?: WorkflowVersion | null
  versionCount?: number
}

/**
 * List workflows efficiently (loads basic info + version counts)
 */
export async function listWorkflows(): Promise<WorkflowWithVersions[]> {
  const supabase = createClient()

  // Get basic workflow info first
  const { data: workflows, error } = await supabase
    .from("Workflow")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50) // Reasonable limit

  if (error) {
    console.error("Failed to list workflows:", error)
    return []
  }

  if (!workflows || workflows.length === 0) {
    return []
  }

  // Get version counts efficiently using aggregation
  const workflowIds = workflows.map((w) => w.wf_id)

  // Count versions per workflow
  const versionCountsPromise = supabase
    .from("WorkflowVersion")
    .select("workflow_id")
    .in("workflow_id", workflowIds)

  // Get latest version for each workflow
  const latestVersionsPromise = Promise.all(
    workflowIds.map(async (workflowId) => {
      const { data: latest } = await supabase
        .from("WorkflowVersion")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      return { workflowId, latest }
    })
  )

  const [versionCountsResult, latestVersionsResults] = await Promise.all([
    versionCountsPromise,
    latestVersionsPromise,
  ])

  // Build version count map
  const versionCountMap = new Map()
  if (versionCountsResult.data) {
    for (const version of versionCountsResult.data) {
      const count = versionCountMap.get(version.workflow_id) || 0
      versionCountMap.set(version.workflow_id, count + 1)
    }
  }

  // Build latest version map
  const latestVersionMap = new Map()
  for (const result of latestVersionsResults) {
    if (result.latest) {
      latestVersionMap.set(result.workflowId, result.latest)
    }
  }

  // Transform workflows with version info
  return workflows.map((w) => ({
    ...w,
    versions: [], // Don't load all versions by default
    activeVersion: latestVersionMap.get(w.wf_id) || null,
    versionCount: versionCountMap.get(w.wf_id) || 0,
  }))
}

/**
 * Get a single workflow with its versions
 */
export async function getWorkflow(
  workflowId: string
): Promise<WorkflowWithVersions | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("Workflow")
    .select(
      `
      *,
      versions:WorkflowVersion(*)
    `
    )
    .eq("wf_id", workflowId)
    .single()

  if (error || !data) {
    console.error("Failed to get workflow:", error)
    return null
  }

  const sortedVersions = (data.versions || []).sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return {
    ...data,
    versions: sortedVersions,
    activeVersion: sortedVersions[0] || null,
  }
}

/**
 * Ensure the main workflow exists in the database
 */
async function ensureWorkflowExists(
  description: string,
  workflowId: string
): Promise<void> {
  const supabase = createClient()

  const workflowInsertable: TablesInsert<"Workflow"> = {
    wf_id: workflowId,
    description,
  }

  const { error } = await supabase.from("Workflow").upsert(workflowInsertable)

  if (error) {
    throw new Error(`Failed to upsert workflow: ${error.message}`)
  }
}

/**
 * Create a WorkflowVersion entry
 */
async function createWorkflowVersion({
  workflowVersionId,
  workflowConfig,
  commitMessage,
  workflowId,
  operation = "init",
  parent1Id,
}: {
  workflowVersionId: string
  workflowConfig: WorkflowConfig | Json
  commitMessage: string
  workflowId: string
  operation?: "init" | "mutation"
  parent1Id?: string
}): Promise<void> {
  const supabase = createClient()

  await ensureWorkflowExists(commitMessage, workflowId)

  const workflowVersionInsertable: TablesInsert<"WorkflowVersion"> = {
    wf_version_id: workflowVersionId,
    workflow_id: workflowId,
    commit_message: commitMessage,
    dsl: workflowConfig as unknown as Json,
    iteration_budget: 10,
    time_budget_seconds: 3600,
    generation_id: null,
    operation: operation,
    parent1_id: parent1Id || null,
    parent2_id: null,
  }

  const { error } = await supabase
    .from("WorkflowVersion")
    .upsert(workflowVersionInsertable, {
      onConflict: "wf_version_id",
    })

  if (error) {
    throw new Error(`Failed to upsert workflow version: ${error.message}`)
  }
}

/**
 * Create a new workflow with initial version
 */
export async function createWorkflow(
  description: string,
  dsl: WorkflowConfig,
  commitMessage: string
): Promise<{ workflowId: string; versionId: string }> {
  const workflowId = nanoid()
  const versionId = nanoid()

  await ensureWorkflowExists(description, workflowId)

  await createWorkflowVersion({
    workflowVersionId: versionId,
    workflowConfig: dsl,
    commitMessage,
    workflowId,
    operation: "init",
  })

  return { workflowId, versionId }
}

/**
 * Add a new version to an existing workflow
 */
export async function saveWorkflowVersion(
  workflowId: string,
  dsl: WorkflowConfig,
  commitMessage: string,
  parentVersionId?: string
): Promise<string> {
  const versionId = nanoid()

  await createWorkflowVersion({
    workflowVersionId: versionId,
    workflowConfig: dsl,
    commitMessage,
    workflowId,
    operation: "mutation",
    parent1Id: parentVersionId,
  })

  return versionId
}

/**
 * Delete a workflow and all its versions
 */
export async function deleteWorkflow(workflowId: string): Promise<boolean> {
  const supabase = createClient()

  // First delete all versions
  const { error: versionError } = await supabase
    .from("WorkflowVersion")
    .delete()
    .eq("workflow_id", workflowId)

  if (versionError) {
    console.error("Failed to delete workflow versions:", versionError)
    return false
  }

  // Then delete the workflow
  const { error: workflowError } = await supabase
    .from("Workflow")
    .delete()
    .eq("wf_id", workflowId)

  if (workflowError) {
    console.error("Failed to delete workflow:", workflowError)
    return false
  }

  return true
}

/**
 * Update workflow description
 */
export async function updateWorkflowDescription(
  workflowId: string,
  description: string
): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase
    .from("Workflow")
    .update({
      description,
      updated_at: new Date().toISOString(),
    })
    .eq("wf_id", workflowId)

  if (error) {
    console.error("Failed to update workflow:", error)
    return false
  }

  return true
}
