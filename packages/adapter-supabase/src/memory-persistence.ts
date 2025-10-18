/**
 * In-memory implementation of persistence interfaces.
 * Used for tests and local development without database.
 */

import type { Tables } from "@lucky/shared"
import type { Json, TablesInsert } from "@lucky/shared/types/public.types"
import type { TablesUpdate } from "packages/shared/dist"
import type {
  CleanupStats,
  DatasetRecord,
  EvolutionContext,
  IEvolutionPersistence,
  IMessagePersistence,
  INodePersistence,
  IPersistence,
  MessageData,
  NodeInvocationEndData,
  NodeInvocationStartData,
  PopulationStats,
} from "./persistence-interface"

// helper to generate IDs
function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 8)}`
}

/**
 * In-memory evolution persistence.
 * Stores all data in Maps for testing.
 */
class InMemoryEvolutionPersistence implements IEvolutionPersistence {
  private runs = new Map<string, Tables<"EvolutionRun">>()
  private generations = new Map<string, Tables<"Generation">>()
  private workflowVersions = new Map<string, Tables<"WorkflowVersion">>()

  async createRun(data: TablesInsert<"EvolutionRun">, clerkId?: string): Promise<string> {
    const runId = data.run_id || genId("run")
    this.runs.set(runId, {
      ...data,
      run_id: runId,
      start_time: data.start_time || new Date().toISOString(),
      status: (data.status as Tables<"EvolutionRun">["status"]) || "running",
      clerk_id: clerkId ?? data.clerk_id ?? null,
      end_time: data.end_time ?? null,
      evolution_type: data.evolution_type ?? null,
      notes: data.notes ?? null,
      config: data.config,
      goal_text: data.goal_text,
    } as Tables<"EvolutionRun">)
    return runId
  }

  async completeRun(runId: string, status: string, notes?: string): Promise<void> {
    const run = this.runs.get(runId)
    if (run) {
      run.status = status === "cancelled" ? "interrupted" : (status as Tables<"EvolutionRun">["status"])
      run.end_time = new Date().toISOString()
      if (notes) run.notes = notes
    }
  }

  async createGeneration(data: TablesInsert<"Generation">, clerkId?: string): Promise<string> {
    const generationId = data.generation_id || genId("gen")
    this.generations.set(generationId, {
      ...data,
      generation_id: generationId,
      clerk_id: clerkId ?? data.clerk_id ?? null,
      start_time: data.start_time || new Date().toISOString(),
      end_time: data.end_time ?? null,
      best_workflow_version_id: data.best_workflow_version_id ?? null,
      comment: data.comment ?? null,
      feedback: data.feedback ?? null,
      number: data.number,
      run_id: data.run_id,
    } as Tables<"Generation">)
    return generationId
  }

  async completeGeneration(update: TablesUpdate<"Generation">, stats?: PopulationStats): Promise<void> {
    if (!update.generation_id) return
    const generation = this.generations.get(update.generation_id)
    if (generation) {
      generation.end_time = new Date().toISOString()
      generation.best_workflow_version_id = update.best_workflow_version_id ?? null
      generation.comment = stats
        ? `Best: ${stats.bestFitness.toFixed(3)}, Avg: ${stats.avgFitness.toFixed(3)}, Cost: $${stats.evaluationCost.toFixed(2)}`
        : (update.comment ?? null)
      generation.feedback = update.feedback ?? null
    }
  }

  async generationExists(runId: string, generationNumber: number): Promise<boolean> {
    return Array.from(this.generations.values()).some(g => g.run_id === runId && g.number === generationNumber)
  }

  async getGenerationIdByNumber(runId: string, generationNumber: number): Promise<string | null> {
    const generation = Array.from(this.generations.values()).find(
      g => g.run_id === runId && g.number === generationNumber,
    )
    return generation?.generation_id || null
  }

  async getLastCompletedGeneration(runId: string): Promise<EvolutionContext | null> {
    const completed = Array.from(this.generations.values())
      .filter(g => g.run_id === runId && g.end_time)
      .sort((a, b) => b.number - a.number)

    if (completed.length === 0) return null

    return {
      runId,
      generationNumber: completed[0].number,
      generationId: completed[0].generation_id,
    }
  }
}

/**
 * In-memory node persistence.
 */
class InMemoryNodePersistence implements INodePersistence {
  saveNodeInvocation(data: TablesInsert<"NodeInvocation">, clerkId?: string): Promise<{ nodeInvocationId: string }> {
    throw new Error("Method not implemented.")
  }

  private nodeVersions = new Map<string, Tables<"NodeVersion">>()
  private nodeInvocations = new Map<string, Tables<"NodeInvocation">>()

  async saveNodeVersion(data: TablesInsert<"NodeVersion">, clerkId?: string): Promise<{ nodeVersionId: string }> {
    const nodeVersionId = data.node_version_id || genId("node_ver")
    this.nodeVersions.set(nodeVersionId, {
      ...data,
      node_version_id: nodeVersionId,
      created_at: data.created_at || new Date().toISOString(),
      description: data.description ?? null,
      extras: data.extras,
      handoffs: data.handoffs ?? null,
      llm_model: data.llm_model,
      memory: data.memory ?? null,
      node_id: data.node_id ?? "",
      system_prompt: data.system_prompt,
      tools: data.tools,
      updated_at: data.updated_at || new Date().toISOString(),
      version: data.version,
      waiting_for: data.waiting_for ?? null,
      wf_version_id: data.wf_version_id,
    } as Tables<"NodeVersion">)
    return { nodeVersionId }
  }
  async createNodeInvocationStart(data: NodeInvocationStartData): Promise<{ nodeInvocationId: string }> {
    const nodeInvocationId = data.nodeInvocationId
    this.nodeInvocations.set(nodeInvocationId, {
      node_invocation_id: nodeInvocationId,
      status: "running",
      start_time: data.startTime,
      model: data.model,
      attempt_no: data.attemptNo ?? 1,
      output: null,
      summary: null,
      usd_cost: 0,
      error: null,
      extras: null,
      metadata: null,
      updated_at: new Date().toISOString(),
      wf_invocation_id: data.workflowInvocationId,
      wf_version_id: data.workflowVersionId,
      node_id: data.nodeId,
      node_version_id: data.nodeVersionId,
      end_time: null,
      files: null,
    } as Tables<"NodeInvocation">)
    return { nodeInvocationId }
  }
  async updateNodeInvocationEnd(data: NodeInvocationEndData): Promise<void> {
    const invocation = this.nodeInvocations.get(data.nodeInvocationId)
    if (invocation) {
      invocation.end_time = data.endTime
      invocation.status = data.status
      invocation.output = data.output as Json
      invocation.summary = data.summary
      invocation.usd_cost = data.usdCost
      if (data.error !== undefined) invocation.error = data.error as Json
      if (data.files !== undefined) invocation.files = data.files
      // Store agent_steps and updated_memory in extras JSON
      const extras: Record<string, unknown> = (
        invocation.extras && typeof invocation.extras === "object" && !Array.isArray(invocation.extras)
          ? invocation.extras
          : {}
      ) as Record<string, unknown>
      if (data.agentSteps !== undefined) extras.agentSteps = data.agentSteps
      if (data.updatedMemory !== undefined) extras.updatedMemory = data.updatedMemory
      invocation.extras = extras as Json
      invocation.updated_at = new Date().toISOString()
    }
  }

  async retrieveNodeSummaries(workflowInvocationId: string): Promise<Array<{ nodeId: string; summary: string }>> {
    return Array.from(this.nodeInvocations.values())
      .filter(inv => inv.wf_invocation_id === workflowInvocationId)
      .map(inv => ({ nodeId: inv.node_id, summary: inv.summary || "" }))
  }

  async updateNodeMemory(nodeId: string, workflowVersionId: string, memory: Record<string, string>): Promise<void> {
    const nodeVersion = Array.from(this.nodeVersions.values()).find(
      nv => nv.node_id === nodeId && nv.wf_version_id === workflowVersionId,
    )
    if (nodeVersion) {
      nodeVersion.memory = memory
    }
  }
}

/**
 * In-memory message persistence.
 */
class InMemoryMessagePersistence implements IMessagePersistence {
  private messages = new Map<string, Tables<"Message">>()

  async save(message: MessageData): Promise<void> {
    this.messages.set(message.messageId, {
      msg_id: message.messageId,
      from_node_id: message.fromNodeId ?? null,
      target_invocation_id: message.originInvocationId ?? null,
      to_node_id: message.toNodeId ?? null,
      origin_invocation_id: message.originInvocationId ?? null,
      seq: message.seq ?? 0,
      role: message.role,
      payload: message.payload as unknown as Json,
      created_at: message.createdAt,
      wf_invocation_id: message.workflowInvocationId,
    } as Tables<"Message">)
  }

  async update(messageId: string, updates: Partial<MessageData>): Promise<void> {
    const message = this.messages.get(messageId)
    if (message) {
      if (updates.fromNodeId !== undefined) message.from_node_id = updates.fromNodeId || null
      if (updates.toNodeId !== undefined) message.to_node_id = updates.toNodeId || null
      if (updates.originInvocationId !== undefined) {
        message.target_invocation_id = updates.originInvocationId || null
        message.origin_invocation_id = updates.originInvocationId || null
      }
      if (updates.seq !== undefined) message.seq = updates.seq
      if (updates.role !== undefined) message.role = updates.role
      if (updates.payload !== undefined) message.payload = updates.payload as unknown as Json
      if (updates.createdAt !== undefined) message.created_at = updates.createdAt
      if (updates.workflowInvocationId !== undefined) message.wf_invocation_id = updates.workflowInvocationId
    }
  }
}

/**
 * In-memory persistence implementation.
 * All data stored in memory, perfect for tests.
 */
export class InMemoryPersistence implements IPersistence {
  private workflows = new Map<string, Tables<"Workflow">>()
  private workflowVersions = new Map<string, Tables<"WorkflowVersion"> & { all_workflow_io?: unknown[] }>()
  private workflowInvocations = new Map<string, Tables<"WorkflowInvocation">>()
  public evolution: IEvolutionPersistence
  public nodes: INodePersistence
  public messages: IMessagePersistence

  constructor() {
    this.evolution = new InMemoryEvolutionPersistence()
    this.nodes = new InMemoryNodePersistence()
    this.messages = new InMemoryMessagePersistence()
  }

  async ensureWorkflowExists(workflowId: string, description: string, clerkId?: string): Promise<void> {
    if (!this.workflows.has(workflowId)) {
      this.workflows.set(workflowId, {
        wf_id: workflowId,
        description,
        clerk_id: clerkId ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Tables<"Workflow">)
    }
  }

  async createWorkflowVersion(data: Tables<"WorkflowVersion">): Promise<void> {
    await this.ensureWorkflowExists(data.workflow_id, data.commit_message)
    this.workflowVersions.set(data.wf_version_id, data)
  }

  async workflowVersionExists(workflowVersionId: string): Promise<boolean> {
    return this.workflowVersions.has(workflowVersionId)
  }

  async ensureWorkflowVersion(data: Tables<"WorkflowVersion">): Promise<void> {
    this.workflowVersions.set(data.wf_version_id, data)
  }

  async updateWorkflowVersionWithIO(workflowVersionId: string, allWorkflowIO: unknown[]): Promise<void> {
    const version = this.workflowVersions.get(workflowVersionId)
    if (version) {
      version.all_workflow_io = allWorkflowIO
      version.updated_at = new Date().toISOString()
    }
  }

  async createWorkflowInvocation(data: Tables<"WorkflowInvocation">): Promise<void> {
    this.workflowInvocations.set(data.wf_invocation_id, data)
  }

  async updateWorkflowInvocation(data: TablesUpdate<"WorkflowInvocation">): Promise<void> {
    if (!data.wf_invocation_id) return
    const invocation = this.workflowInvocations.get(data.wf_invocation_id)
    if (invocation) {
      this.workflowInvocations.set(invocation.wf_invocation_id, {
        ...invocation,
        ...data,
        end_time: new Date().toISOString(),
      } as Tables<"WorkflowInvocation">)
    }
  }

  async getWorkflowVersion(workflowVersionId: string): Promise<string | null> {
    return this.workflowVersions.has(workflowVersionId) ? workflowVersionId : null
  }

  async loadWorkflowConfig(workflowVersionId: string): Promise<unknown> {
    const version = this.workflowVersions.get(workflowVersionId)
    return version?.dsl || null
  }

  async loadWorkflowConfigForDisplay(workflowVersionId: string): Promise<unknown> {
    return this.loadWorkflowConfig(workflowVersionId)
  }

  async loadLatestWorkflowConfig(workflowId?: string): Promise<unknown> {
    const versions = Array.from(this.workflowVersions.values())
    const filtered = workflowId ? versions.filter(v => v.workflow_id === workflowId) : versions
    const latest = filtered.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0]
    return latest?.dsl || null
  }

  async updateWorkflowMemory(workflowVersionId: string, workflowConfig: unknown): Promise<void> {
    const version = this.workflowVersions.get(workflowVersionId)
    if (version) {
      version.dsl = workflowConfig as Json
    }
  }

  async loadDatasetRecords(_recordIds: string[]): Promise<DatasetRecord[]> {
    // Return empty array for in-memory implementation
    return []
  }

  async cleanupStaleRecords(): Promise<CleanupStats> {
    // No-op for in-memory implementation
    return {
      workflowInvocations: 0,
      nodeInvocations: 0,
      evolutionRuns: 0,
      generations: 0,
      messages: 0,
      evolutionRunsEndTimes: 0,
    }
  }

  // Helper methods for tests
  getWorkflowVersions() {
    return Array.from(this.workflowVersions.values())
  }

  getInvocations() {
    return Array.from(this.workflowInvocations.values())
  }

  clear() {
    this.workflows.clear()
    this.workflowVersions.clear()
    this.workflowInvocations.clear()
  }
}
