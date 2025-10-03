import type { Json } from "@core/utils/json"
import { lgg } from "@core/utils/logging/Logger"
import type { WorkflowIO } from "@core/workflow/ingestion/ingestion.types"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import type {
  IPersistence,
  WorkflowInvocationData,
  WorkflowInvocationUpdate,
  WorkflowVersionData,
} from "@together/adapter-supabase"

/**
 * Auxiliary function to ensure the main workflow exists in the database
 */
export const ensureWorkflowExists = async (
  persistence: IPersistence | undefined,
  description: string,
  workflowId: string,
): Promise<void> => {
  if (!persistence) return
  await persistence.ensureWorkflowExists(workflowId, description)
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
  const data: WorkflowVersionData = {
    workflowVersionId,
    workflowId,
    commitMessage,
    dsl: workflowConfig,
    generationId: generation,
    operation,
    parent1Id,
    parent2Id,
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

  const data: WorkflowInvocationData = {
    workflowInvocationId,
    workflowVersionId,
    runId,
    generationId: generation,
    metadata,
    fitness,
    expectedOutputType,
    workflowInput,
    workflowOutput,
  }
  await persistence.createWorkflowInvocation(data)
}

export const updateWorkflowInvocationInDatabase = async (
  persistence: IPersistence | undefined,
  params: WorkflowInvocationUpdate,
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
