import { normalizeModelName } from "@core/messages/api/sendAI/sendAI"
import type { AgentSteps } from "@core/messages/pipeline/AgentStep.types"
import { supabase } from "@core/utils/clients/supabase/client"
import type { Json, TablesInsert } from "@core/utils/clients/supabase/types"
import { llmify } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import type { ModelName } from "@core/utils/spending/models.types"
import { CONFIG } from "@runtime/settings/constants"
import { JSONN } from "@shared/utils/files/json/jsonParse"

type SaveNodeInvocationOpts = {
  nodeId: string
  start_time: string
  messageId: string
  usdCost: number
  output: string
  workflowInvocationId: string
  agentSteps?: AgentSteps
  summary: string
  files?: string[]
  workflowVersionId: string
  model: ModelName
  updatedMemory?: Record<string, string>
}

export const saveNodeInvocationToDB = async ({
  nodeId,
  start_time,
  messageId,
  usdCost,
  output,
  workflowInvocationId,
  agentSteps,
  summary,
  files,
  workflowVersionId,
  model,
  updatedMemory,
}: SaveNodeInvocationOpts): Promise<{ nodeInvocationId: string }> => {
  // Debug logging for tool calls
  lgg.onlyIf(
    CONFIG.logging.override.Tools,
    `[saveNodeInvocation] Saving agentSteps: ${agentSteps?.length} outputs`
  )

  const contentToSave = JSONN.isJSON(output)
    ? JSONN.extract(output) // Don't throw on JSON parse failure
    : llmify(output)

  const insertable: TablesInsert<"NodeInvocation"> = {
    node_id: nodeId,
    wf_invocation_id: workflowInvocationId,
    wf_version_id: workflowVersionId,
    start_time: start_time,
    end_time: new Date().toISOString(),
    status: "completed",
    usd_cost: usdCost,
    extras: {
      message_id: messageId,
      ...(agentSteps && {
        agentSteps: agentSteps,
      }),
      ...(updatedMemory && {
        updatedMemory: updatedMemory,
      }),
    } as unknown as Json,
    output: contentToSave as Json,
    metadata: {},
    summary,
    files: files || null,
    model: normalizeModelName(model),
  }

  if (CONFIG.logging.override.Database) {
    // Check if NodeVersion exists before attempting insert
    const { data: nodeVersionCheck, error: nodeVersionError } = await supabase
      .from("NodeVersion")
      .select("node_id, version")
      .eq("node_id", nodeId)
      .eq("wf_version_id", workflowVersionId)
      .single()

    if (nodeVersionError || !nodeVersionCheck) {
      lgg.error(
        `[DB] CRITICAL: NodeVersion does not exist for nodeId: ${nodeId}, workflowVersionId: ${workflowVersionId}`,
        JSONN.show(nodeVersionError)
      )
    }
  }

  const { error, data } = await supabase
    .from("NodeInvocation")
    .insert(insertable)
    .select()
    .single()

  if (error) {
    lgg.error(
      "Error saving node invocation:",
      JSONN.show(insertable),
      JSONN.show(error)
    )
  }

  if (!data) {
    throw new Error(
      `Failed to save node invocation for nodeId: ${nodeId}, messageId: ${messageId}, workflowInvocationId: ${workflowInvocationId}. Supabase returned no data after insert operation.`
    )
  }

  return { nodeInvocationId: data.node_invocation_id }
}
