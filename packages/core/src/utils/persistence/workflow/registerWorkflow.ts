import type { WorkflowIO } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import type { IPersistence } from "@lucky/adapter-supabase"
import type { Json, TablesInsert, TablesUpdate } from "@lucky/shared"

/**
 * Auxiliary function to ensure the main workflow exists in the database
 */
export const ensureWorkflowExists = async (
  persistence: IPersistence | undefined,
  description: string,
  workflowId: string,
  clerkId?: string,
): Promise<void> => {
  if (!persistence) return
  await persistence.ensureWorkflowExists(workflowId, description, clerkId)
}

/**
 * Auxiliary function to create a WorkflowVersion entry
 */
export const createWorkflowVersion = async ({
  persistence,
  workflowVersionId,
  workflowConfig,
  commitMessage,
  generation,
  operation,
  parent1Id,
  parent2Id,
  workflowId,
}: {
  persistence: IPersistence | undefined
  workflowVersionId: string
  workflowConfig: WorkflowConfig | Json
  commitMessage: string
  workflowId: string
  generation?: string
  operation?: "init" | "crossover" | "mutation" | "immigrant"
  parent1Id?: string
  parent2Id?: string
}): Promise<void> => {
  if (!persistence) return
  const data: TablesInsert<"WorkflowVersion"> = {
    wf_version_id: workflowVersionId,
    workflow_id: workflowId,
    commit_message: commitMessage,
    dsl: workflowConfig as Json,
    generation_id: generation,
    operation,
    parent1_id: parent1Id,
    parent2_id: parent2Id,
  }
  await persistence.createWorkflowVersion(data)
}

/**
 * Auxiliary function to create a WorkflowInvocation entry
 */
export const createWorkflowInvocation = async ({
  persistence,
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
  persistence: IPersistence | undefined
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
  if (!persistence) return

  const data: TablesInsert<"WorkflowInvocation"> = {
    wf_invocation_id: workflowInvocationId,
    wf_version_id: workflowVersionId,
    run_id: runId ?? null,
    generation_id: generation ?? null,
    extras: metadata ?? {},
    fitness: fitness ?? null,
    expected_output_type: expectedOutputType ?? null,
    workflow_input: workflowInput ?? null,
    workflow_output: workflowOutput ?? null,
    status: "running",
    start_time: new Date().toISOString(),
    end_time: null,
    usd_cost: 0,
    actual_output: null,
    dataset_record_id: null,
    evaluator_id: null,
    expected_output: null,
    feedback: null,
    preparation: null,
  }
  await persistence.createWorkflowInvocation(data as any)
}

export const updateWorkflowInvocationInDatabase = async (
  persistence: IPersistence | undefined,
  params: TablesUpdate<"WorkflowInvocation">,
): Promise<unknown> => {
  if (!persistence) return
  return persistence.updateWorkflowInvocation(params)
}

/**
 * Updates a WorkflowVersion with all_workflow_io after it's been populated
 */
export const updateWorkflowVersionWithIO = async ({
  persistence,
  workflowVersionId,
  allWorkflowIO,
}: {
  persistence: IPersistence | undefined
  workflowVersionId: string
  allWorkflowIO: WorkflowIO[]
}): Promise<void> => {
  if (!persistence) return
  await persistence.updateWorkflowVersionWithIO(workflowVersionId, allWorkflowIO)
}
