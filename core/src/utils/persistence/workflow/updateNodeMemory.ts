import { supabase } from "@core/utils/clients/supabase/client"
import { lgg } from "@core/utils/logging/Logger"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"

/**
 * Updates node memory in the WorkflowVersion DSL
 * @param workflowVersionId - The workflow version to update
 * @param nodeId - The node whose memory to update
 * @param memory - The new memory for the node
 */
export async function updateNodeMemory({
  workflowVersionId,
  nodeId,
  memory,
}: {
  workflowVersionId: string
  nodeId: string
  memory: Record<string, string>
}): Promise<void> {
  try {
    // Fetch the current workflow version
    const { data: version, error: fetchError } = await supabase
      .from("WorkflowVersion")
      .select("dsl")
      .eq("wf_version_id", workflowVersionId)
      .single()

    if (fetchError || !version) {
      throw new Error(
        `Failed to fetch workflow version: ${fetchError?.message}`
      )
    }

    // Update the node's memory in the DSL
    const dsl = version.dsl as unknown as WorkflowConfig
    const node = dsl.nodes.find((n) => n.nodeId === nodeId)

    if (!node) {
      throw new Error(`Node ${nodeId} not found in workflow DSL`)
    }

    // Update the node's memory
    node.memory = memory

    // Save the updated DSL back to the database
    const { error: updateError } = await supabase
      .from("WorkflowVersion")
      .update({
        dsl: dsl as any,
        updated_at: new Date().toISOString(),
      })
      .eq("wf_version_id", workflowVersionId)

    if (updateError) {
      throw new Error(
        `Failed to update workflow version: ${updateError.message}`
      )
    }

    lgg.log(
      `[updateNodeMemory] Updated memory for node ${nodeId} in workflow ${workflowVersionId}`
    )
  } catch (error) {
    lgg.error(`[updateNodeMemory] Error updating node memory: ${error}`)
    throw error
  }
}

/**
 * Updates memory for all nodes in a workflow configuration
 * @param workflowVersionId - The workflow version to update
 * @param workflowConfig - The entire workflow configuration with updated memory
 */
export async function updateWorkflowMemory({
  workflowVersionId,
  workflowConfig,
}: {
  workflowVersionId: string
  workflowConfig: WorkflowConfig
}): Promise<void> {
  try {
    // Save the entire updated DSL back to the database
    const { error: updateError } = await supabase
      .from("WorkflowVersion")
      .update({
        dsl: workflowConfig as any,
        updated_at: new Date().toISOString(),
      })
      .eq("wf_version_id", workflowVersionId)

    if (updateError) {
      throw new Error(
        `Failed to update workflow version: ${updateError.message}`
      )
    }

    // lgg.log(`[updateWorkflowMemory] Updated memory for workflow ${workflowVersionId}`)
  } catch (error) {
    lgg.error(`[updateWorkflowMemory] Error updating workflow memory: ${error}`)
    throw error
  }
}
