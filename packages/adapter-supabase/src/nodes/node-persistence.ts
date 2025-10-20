/**
 * Node persistence implementation for Supabase.
 */

import type { Json, TablesInsert } from "@lucky/shared/types/supabase.types"
import type { SupabaseClient } from "@supabase/supabase-js"
import { InvalidInputError, NodeVersionMissingError, PersistenceError } from "../errors/domain-errors"
import type { INodePersistence, NodeInvocationEndData, NodeInvocationStartData } from "../persistence-interface"

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

  async saveNodeVersion(data: TablesInsert<"NodeVersion">, clerkId?: string): Promise<{ nodeVersionId: string }> {
    const { node_id: nodeId, wf_version_id: workflowVersionId } = data

    if (!nodeId || !workflowVersionId) {
      throw new InvalidInputError(
        `node_id (${nodeId}) or wf_version_id (${workflowVersionId}) is null, undefined, or empty string`,
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

    const insertable: TablesInsert<"NodeVersion"> = {
      ...data,
      version: nextVersion,
      node_id: nodeId,
      wf_version_id: workflowVersionId,
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

  async saveNodeInvocation(
    data: TablesInsert<"NodeInvocation">,
    clerkId?: string,
  ): Promise<{ nodeInvocationId: string }> {
    const insertable: TablesInsert<"NodeInvocation"> = {
      ...data,
      status: data.status || "completed",
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
        .eq("node_id", data.node_id)
        .eq("wf_version_id", data.wf_version_id)
        .maybeSingle()

      if (!nodeVersionCheck) {
        throw new NodeVersionMissingError(data.node_id || "", data.wf_version_id || "", error)
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
