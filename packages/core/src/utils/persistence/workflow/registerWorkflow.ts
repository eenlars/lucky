import { supabase } from "@/utils/clients/supabase/client"
import type {
  Json,
  TablesInsert,
  TablesUpdate,
} from "@/utils/clients/supabase/types"
import type { WorkflowIO } from "@/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@/workflow/schema/workflow.types"
import { lgg } from "@/logger"

/**
 * Auxiliary function to ensure the main workflow exists in the database
 */
export const ensureWorkflowExists = async (
  description: string,
  workflowId: string
): Promise<void> => {
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
 * Auxiliary function to create a WorkflowVersion entry
 */
export const createWorkflowVersion = async ({
  workflowVersionId,
  workflowConfig,
  commitMessage,
  generation,
  operation,
  parent1Id,
  parent2Id,
  workflowId,
}: {
  workflowVersionId: string
  workflowConfig: WorkflowConfig | Json
  commitMessage: string
  workflowId: string
  generation?: string
  operation?: "init" | "crossover" | "mutation" | "immigrant"
  parent1Id?: string
  parent2Id?: string
}): Promise<void> => {
  await ensureWorkflowExists(commitMessage, workflowId)
  const workflowVersionInsertable: TablesInsert<"WorkflowVersion"> = {
    wf_version_id: workflowVersionId,
    workflow_id: workflowId,
    commit_message: commitMessage,
    dsl: workflowConfig as unknown as Json,
    iteration_budget: 10,
    time_budget_seconds: 3600,
    generation_id: generation || null,
    operation: operation || "init",
    parent1_id: parent1Id || null,
    parent2_id: parent2Id || null,
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
 * Auxiliary function to create a WorkflowInvocation entry
 */
export const createWorkflowInvocation = async ({
  workflowInvocationId,
  workflowVersionId,
  runId,
  generation,
  metadata,
  fitness,
  expectedOutputType,
  workflowInput,
  workflowOutput,
}: {
  workflowInvocationId: string
  workflowVersionId: string
  runId?: string
  generation?: string
  metadata?: Json
  fitness?: Json
  expectedOutputType?: Json | null
  workflowInput?: Json
  workflowOutput?: Json
}): Promise<void> => {
  // Debug logging for generation linkage
  // lgg.info(
  //   `[createWorkflowInvocation] Creating invocation:`,
  //   {
  //     workflowInvocationId,
  //     workflowVersionId,
  //     runId,
  //     generation,
  //   }
  // )

  const workflowInvocationInsertable: TablesInsert<"WorkflowInvocation"> = {
    wf_invocation_id: workflowInvocationId,
    wf_version_id: workflowVersionId,
    status: "running",
    start_time: new Date().toISOString(),
    end_time: null,
    usd_cost: 0,
    extras: {},
    metadata: metadata || {},
    run_id: runId || null,
    generation_id: generation || null,
    fitness: fitness || null,
    evaluation_inputs: null,
    expected_output_type: expectedOutputType || null,
    workflow_input: workflowInput || null,
    expected_output:
      typeof workflowOutput === "string"
        ? workflowOutput
        : JSON.stringify(workflowOutput) || null,
  }

  const { error } = await supabase
    .from("WorkflowInvocation")
    .insert(workflowInvocationInsertable)

  if (error) {
    throw new Error(`Failed to insert workflow invocation: ${error.message}`)
  }

  // lgg.info(
  //   `[createWorkflowInvocation] Successfully created invocation ${workflowInvocationId} for generation ${generation || "none"}`
  // )
}

interface UpdateWorkflowInvocationParams
  extends Partial<
    Omit<
      TablesUpdate<"WorkflowInvocation">,
      "wf_invocation_id" | "wf_version_id"
    >
  > {
  /** the PK of the row we're updating */
  workflowInvocationId: string
}

export const updateWorkflowInvocationInDatabase = async ({
  workflowInvocationId,
  ...fields
}: UpdateWorkflowInvocationParams): Promise<TablesUpdate<"WorkflowInvocation"> | null> => {
  // build the actual payload for supabase
  const updatePayload: Partial<TablesUpdate<"WorkflowInvocation">> = {
    ...fields,
  }

  // push the update and return the new row
  const { data, error } = await supabase
    .from("WorkflowInvocation")
    .update(updatePayload)
    .eq("wf_invocation_id", workflowInvocationId)
    .select()
    .single()

  if (error) {
    lgg.error("updateWorkflowInvocationInDatabase error", {
      workflowInvocationId,
      updatePayload,
      error,
    })
  }

  if (!data) {
    return null
  }

  return data
}

/**
 * Updates a WorkflowVersion with all_workflow_io after it's been populated
 */
export const updateWorkflowVersionWithIO = async ({
  workflowVersionId,
  allWorkflowIO,
}: {
  workflowVersionId: string
  allWorkflowIO: WorkflowIO[]
}): Promise<void> => {
  const insertable: TablesUpdate<"WorkflowVersion"> = {
    all_workflow_io: allWorkflowIO,
    wf_version_id: workflowVersionId,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from("WorkflowVersion")
    .update(insertable)
    .eq("wf_version_id", workflowVersionId)

  if (error) {
    throw new Error(
      `Failed to update workflow version with IO: ${error.message}`
    )
  }
}
