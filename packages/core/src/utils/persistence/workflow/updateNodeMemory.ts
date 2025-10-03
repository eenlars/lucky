import { lgg } from "@core/utils/logging/Logger"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import type { IPersistence } from "@together/adapter-supabase"

/**
 * Updates memory for all nodes in a workflow configuration
 * @param workflowVersionId - The workflow version to update
 * @param workflowConfig - The entire workflow configuration with updated memory
 * @param persistence - The persistence adapter
 */
export async function updateWorkflowMemory({
  workflowVersionId,
  workflowConfig,
  persistence,
}: {
  workflowVersionId: string
  workflowConfig: WorkflowConfig
  persistence?: IPersistence
}): Promise<void> {
  if (!persistence) {
    // Skip if no persistence adapter available
    return
  }
  try {
    await persistence.updateWorkflowMemory(workflowVersionId, workflowConfig)
    // lgg.log(`[updateWorkflowMemory] Updated memory for workflow ${workflowVersionId}`)
  } catch (error) {
    lgg.error(`[updateWorkflowMemory] Error updating workflow memory: ${error}`)
    throw error
  }
}
