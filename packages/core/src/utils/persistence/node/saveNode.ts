import { normalizeModelName } from "@/messages/api/sendAI"
import { supabase } from "@/utils/clients/supabase/client"
import type { Json, TablesInsert } from "@/utils/clients/supabase/types"
import { isNir } from "@/utils/common/isNir"
import { isJSON, JSONN } from "@/utils/file-types/json/jsonParse"
import { lgg } from "@/utils/logging/Logger"
import { safeJSON } from "@/trace-visualization/db/Workflow/utils"
import type { WorkflowNodeConfig } from "@workflow/schema/workflow.types"

export const saveNodeVersionToDB = async ({
  config,
  workflowVersionId,
}: {
  config: WorkflowNodeConfig
  workflowVersionId: string
}): Promise<{ nodeVersionId: string }> => {
  // Check if node already exists for this workflow version
  const { data: existingNode } = await supabase
    .from("NodeVersion")
    .select("version")
    .eq("node_id", config.nodeId)
    .eq("wf_version_id", workflowVersionId)
    .single()

  const nextVersion = existingNode ? existingNode.version + 1 : 1

  // nodeId and wf_version_id are the composite primary key
  if (isNir(config.nodeId) || isNir(workflowVersionId)) {
    throw new Error(
      `nodeId (${config.nodeId}) or workflowVersionId (${workflowVersionId}) is null, undefined, or empty string`
    )
  }

  let memory: Json | undefined
  if (!isNir(config.memory) && isJSON(config.memory)) {
    memory = safeJSON(config.memory) as Json
  }

  const insertable: TablesInsert<"NodeVersion"> = {
    node_id: config.nodeId,
    wf_version_id: workflowVersionId,
    version: nextVersion,
    llm_model: normalizeModelName(config.modelName),
    system_prompt: config.systemPrompt,
    tools: [...config.mcpTools, ...config.codeTools],
    extras: {},
    description: config.description,
    memory,
    handoffs: config.handOffs,
    waiting_for: config.waitingFor,
  }

  const { error: error2, data } = await supabase
    .from("NodeVersion")
    .insert(insertable)
    .select()
    .single()

  if (error2) {
    // Check if this is a constraint violation (node already exists)
    if (
      error2.code === "23505" ||
      error2.message.includes("duplicate") ||
      error2.message.includes("unique")
    ) {
      // Query for the existing node again
      const { data: retryData, error: retryError } = await supabase
        .from("NodeVersion")
        .select("node_id")
        .eq("node_id", config.nodeId)
        .eq("wf_version_id", workflowVersionId)
        .single()

      if (retryError || !retryData) {
        lgg.error(
          `Failed to retrieve existing NodeVersion after constraint violation for nodeId: ${config.nodeId}`,
          JSONN.show(retryError)
        )
        throw new Error(`Error saving node: ${error2.message}`)
      }

      return { nodeVersionId: retryData.node_id }
    }

    lgg.error(
      "registerNodeInDatabase error inserting node",
      JSONN.show(insertable),
      JSONN.show(error2)
    )
    throw new Error(`Error saving node: ${error2.message}`)
  }

  return { nodeVersionId: data.node_id }
}
