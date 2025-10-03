/**
 * Node persistence implementation for Supabase.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { applyFieldMappings } from "./field-mapper"
import type { INodePersistence, NodeInvocationData, NodeVersionData } from "./persistence-interface"

export class SupabaseNodePersistence implements INodePersistence {
  constructor(private client: SupabaseClient) {}

  async saveNodeVersion(data: NodeVersionData): Promise<{ nodeVersionId: string }> {
    const { nodeId, workflowVersionId, config } = data

    // Check if node already exists for this workflow version
    const { data: existingNode } = await this.client
      .from("NodeVersion")
      .select("version")
      .eq("node_id", nodeId)
      .eq("wf_version_id", workflowVersionId)
      .single()

    const nextVersion = existingNode ? existingNode.version + 1 : 1

    if (!nodeId || !workflowVersionId) {
      throw new Error(
        `nodeId (${nodeId}) or workflowVersionId (${workflowVersionId}) is null, undefined, or empty string`,
      )
    }

    // Extract config fields
    const { modelName, systemPrompt, mcpTools = [], codeTools = [], description, memory, handOffs } = config as any

    const insertable = {
      node_id: nodeId,
      wf_version_id: workflowVersionId,
      version: nextVersion,
      llm_model: modelName,
      system_prompt: systemPrompt,
      tools: [...(Array.isArray(mcpTools) ? mcpTools : []), ...(Array.isArray(codeTools) ? codeTools : [])],
      extras: {},
      description: description,
      memory: memory,
      handoffs: handOffs,
    }

    const { data: result, error } = await this.client
      .from("NodeVersion")
      .insert(insertable)
      .select("node_version_id")
      .single()

    if (error) {
      throw new Error(`Failed to save node version: ${error.message}`)
    }

    return { nodeVersionId: result.node_version_id }
  }

  async saveNodeInvocation(data: NodeInvocationData): Promise<{ nodeInvocationId: string }> {
    const mapped = applyFieldMappings(data)

    // Transform specific fields that need special handling
    const insertable = {
      ...mapped,
      status: "completed",
      extras: {
        message_id: mapped.message_id,
        ...(mapped.agent_steps && { agentSteps: mapped.agent_steps }),
        ...(mapped.updated_memory && { updatedMemory: mapped.updated_memory }),
      },
      metadata: {},
    }

    // Remove fields that were moved to extras
    insertable.message_id = undefined
    insertable.agent_steps = undefined
    insertable.updated_memory = undefined

    const { data: result, error } = await this.client
      .from("NodeInvocation")
      .insert(insertable)
      .select("node_invocation_id")
      .single()

    if (error) {
      // Check if NodeVersion exists before throwing error
      const { data: nodeVersionCheck } = await this.client
        .from("NodeVersion")
        .select("node_id, version")
        .eq("node_id", data.nodeId)
        .eq("wf_version_id", data.workflowVersionId)
        .single()

      if (!nodeVersionCheck) {
        throw new Error(
          `Cannot save NodeInvocation: NodeVersion doesn't exist for node_id=${data.nodeId}, wf_version_id=${data.workflowVersionId}`,
        )
      }

      throw new Error(`Failed to save node invocation: ${error.message}`)
    }

    return { nodeInvocationId: result.node_invocation_id }
  }

  async retrieveNodeSummaries(workflowInvocationId: string): Promise<Array<{ nodeId: string; summary: string }>> {
    const { data, error } = await this.client
      .from("NodeInvocation")
      .select("node_id, summary")
      .eq("wf_invocation_id", workflowInvocationId)
      .order("start_time", { ascending: true })

    if (error) {
      throw new Error(`Failed to retrieve node summaries: ${error.message}`)
    }

    return (data || []).map(item => ({
      nodeId: item.node_id,
      summary: item.summary,
    }))
  }

  async updateNodeMemory(nodeId: string, workflowVersionId: string, memory: Record<string, string>): Promise<void> {
    const { error } = await this.client
      .from("NodeVersion")
      .update({ memory })
      .eq("node_id", nodeId)
      .eq("wf_version_id", workflowVersionId)

    if (error) {
      throw new Error(`Failed to update node memory: ${error.message}`)
    }
  }
}
