/**
 * Node persistence implementation for Supabase.
 */

import type { Json, TablesInsert } from "@lucky/shared/types/supabase.types"
import type { SupabaseClient } from "@supabase/supabase-js"
import { InvalidInputError, NodeVersionMissingError, PersistenceError } from "../errors/domain-errors"
import type {
  INodePersistence,
  NodeInvocationData,
  NodeInvocationEndData,
  NodeInvocationStartData,
  NodeVersionData,
} from "../persistence-interface"

export class SupabaseNodePersistence implements INodePersistence {
  constructor(private client: SupabaseClient) {}

  /**
   * Creates a NodeInvocation record at the start of node execution.
   * Sets status='running' to enable real-time progress tracking.
   *
   * @param data - Node invocation start data (nodeId, model, timestamps, etc.)
   * @returns The generated nodeInvocationId for later updates
   */
  async createNodeInvocationStart(data: NodeInvocationStartData): Promise<{ nodeInvocationId: string }> {
    const insertable: TablesInsert<"NodeInvocation"> = {
      node_id: data.nodeId,
      node_version_id: data.nodeVersionId,
      wf_invocation_id: data.workflowInvocationId,
      wf_version_id: data.workflowVersionId,
      start_time: data.startTime,
      model: data.model,
      status: "running",
      attempt_no: data.attemptNo ?? 1,
      output: null,
      summary: "",
      usd_cost: 0,
      extras: {},
      metadata: {},
    }

    const { data: result, error } = await this.client
      .from("NodeInvocation")
      .insert(insertable)
      .select("node_invocation_id")
      .single()

    if (error) {
      throw new PersistenceError(`Failed to create node invocation start: ${error.message}`, error)
    }

    return { nodeInvocationId: result.node_invocation_id }
  }

  /**
   * Updates an existing NodeInvocation record at the end of node execution.
   * Sets status='completed' or 'failed' and records final output, cost, and timing.
   *
   * @param data - Node invocation end data (status, output, summary, cost, etc.)
   */
  async updateNodeInvocationEnd(data: NodeInvocationEndData): Promise<void> {
    const extras: Record<string, unknown> = {}
    if (data.agentSteps) {
      extras.agentSteps = data.agentSteps
    }
    if (data.updatedMemory) {
      extras.updatedMemory = data.updatedMemory
    }

    const updateData = {
      end_time: data.endTime,
      status: data.status,
      output: data.output,
      summary: data.summary,
      usd_cost: data.usdCost,
      files: data.files,
      error: data.error,
      extras,
      updated_at: new Date().toISOString(),
    }

    const { error } = await this.client
      .from("NodeInvocation")
      .update(updateData)
      .eq("node_invocation_id", data.nodeInvocationId)

    if (error) {
      throw new PersistenceError(`Failed to update node invocation end: ${error.message}`, error)
    }
  }

  async saveNodeVersion(data: NodeVersionData): Promise<{ nodeVersionId: string }> {
    const { nodeId, workflowVersionId, config } = data

    if (!nodeId || !workflowVersionId) {
      throw new InvalidInputError(
        `nodeId (${nodeId}) or workflowVersionId (${workflowVersionId}) is null, undefined, or empty string`,
      )
    }

    // Check if node already exists for this workflow version
    const { data: existingNode, error: queryError } = await this.client
      .from("NodeVersion")
      .select("version")
      .eq("node_id", nodeId)
      .eq("wf_version_id", workflowVersionId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (queryError) {
      throw new PersistenceError(`Failed to query existing node versions: ${queryError.message}`, queryError)
    }

    const nextVersion = existingNode?.version ? existingNode.version + 1 : 1

    // Extract config fields
    const { modelName, systemPrompt, mcpTools = [], codeTools = [], description, memory, handOffs } = config as any

    const insertable: TablesInsert<"NodeVersion"> = {
      node_id: nodeId,
      wf_version_id: workflowVersionId,
      version: nextVersion,
      llm_model: modelName,
      system_prompt: systemPrompt,
      tools: [...(Array.isArray(mcpTools) ? mcpTools : []), ...(Array.isArray(codeTools) ? codeTools : [])],
      extras: {},
      description,
      memory,
      handoffs: handOffs,
    }

    const { data: result, error } = await this.client
      .from("NodeVersion")
      .insert(insertable)
      .select("node_version_id")
      .single()

    if (error) {
      throw new PersistenceError(`Failed to save node version: ${error.message}`, error)
    }

    return { nodeVersionId: result.node_version_id }
  }

  async saveNodeInvocation(data: NodeInvocationData): Promise<{ nodeInvocationId: string }> {
    // Build extras with fields not in DB schema
    const extras: Record<string, unknown> = {}
    if (data.messageId) extras.message_id = data.messageId
    if (data.agentSteps) extras.agentSteps = data.agentSteps
    if (data.updatedMemory) extras.updatedMemory = data.updatedMemory

    // Manually build insertable with snake_case fields (fields going to extras are excluded)
    const insertable: TablesInsert<"NodeInvocation"> = {
      node_id: data.nodeId,
      node_version_id: data.nodeVersionId,
      wf_invocation_id: data.workflowInvocationId,
      wf_version_id: data.workflowVersionId,
      start_time: data.startTime,
      end_time: data.endTime,
      usd_cost: data.usdCost,
      output: data.output as Json,
      summary: data.summary,
      files: data.files,
      model: data.model,
      status: "completed",
      extras: extras as Json,
      metadata: {},
    }

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
        .maybeSingle()

      if (!nodeVersionCheck) {
        throw new NodeVersionMissingError(data.nodeId, data.workflowVersionId, error)
      }

      throw new PersistenceError(`Failed to save node invocation: ${error.message}`, error)
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
      throw new PersistenceError(`Failed to retrieve node summaries: ${error.message}`, error)
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
      throw new PersistenceError(`Failed to update node memory: ${error.message}`, error)
    }
  }
}
