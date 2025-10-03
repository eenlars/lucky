/**
 * In-memory implementation of persistence interfaces.
 * Used for tests and local development without database.
 */

import type {
  CleanupStats,
  DatasetRecord,
  EvolutionContext,
  GenerationData,
  GenerationUpdate,
  IEvolutionPersistence,
  IMessagePersistence,
  INodePersistence,
  IPersistence,
  MessageData,
  NodeInvocationData,
  NodeVersionData,
  PopulationStats,
  RunData,
  WorkflowInvocationData,
  WorkflowInvocationUpdate,
  WorkflowVersionData,
} from "./persistence-interface"

// helper to generate IDs
function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 15)}`
}

/**
 * In-memory evolution persistence.
 * Stores all data in Maps for testing.
 */
class InMemoryEvolutionPersistence implements IEvolutionPersistence {
  private runs = new Map<string, any>()
  private generations = new Map<string, any>()
  private workflowVersions = new Map<string, any>()

  async createRun(data: RunData): Promise<string> {
    const runId = genId("run")
    this.runs.set(runId, {
      run_id: runId,
      goal_text: data.goalText,
      config: data.config,
      status: data.status,
      start_time: new Date().toISOString(),
      evolution_type: data.evolutionType,
      notes: data.notes,
    })
    return runId
  }

  async completeRun(runId: string, status: string, notes?: string): Promise<void> {
    const run = this.runs.get(runId)
    if (run) {
      run.status = status
      run.end_time = new Date().toISOString()
      if (notes) run.notes = notes
    }
  }

  async createGeneration(data: GenerationData): Promise<string> {
    const generationId = genId("gen")
    this.generations.set(generationId, {
      generation_id: generationId,
      number: data.generationNumber,
      run_id: data.runId,
      start_time: new Date().toISOString(),
    })
    return generationId
  }

  async completeGeneration(update: GenerationUpdate, stats?: PopulationStats): Promise<void> {
    const generation = this.generations.get(update.generationId)
    if (generation) {
      generation.end_time = new Date().toISOString()
      generation.best_workflow_version_id = update.bestWorkflowVersionId
      generation.comment = stats
        ? `Best: ${stats.bestFitness.toFixed(3)}, Avg: ${stats.avgFitness.toFixed(3)}, Cost: $${stats.evaluationCost.toFixed(2)}`
        : update.comment
      generation.feedback = update.feedback
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
  private nodeVersions = new Map<string, any>()
  private nodeInvocations = new Map<string, any>()

  async saveNodeVersion(data: NodeVersionData): Promise<{ nodeVersionId: string }> {
    const nodeVersionId = genId("node_ver")
    this.nodeVersions.set(nodeVersionId, {
      node_version_id: nodeVersionId,
      node_id: data.nodeId,
      wf_version_id: data.workflowVersionId,
      config: data.config,
    })
    return { nodeVersionId }
  }

  async saveNodeInvocation(data: NodeInvocationData): Promise<{ nodeInvocationId: string }> {
    const nodeInvocationId = genId("node_inv")
    this.nodeInvocations.set(nodeInvocationId, {
      node_invocation_id: nodeInvocationId,
      ...data,
    })
    return { nodeInvocationId }
  }

  async retrieveNodeSummaries(workflowInvocationId: string): Promise<Array<{ nodeId: string; summary: string }>> {
    return Array.from(this.nodeInvocations.values())
      .filter(inv => inv.workflowInvocationId === workflowInvocationId)
      .map(inv => ({ nodeId: inv.nodeId, summary: inv.summary || "" }))
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
  private messages = new Map<string, any>()

  async save(message: MessageData): Promise<void> {
    this.messages.set(message.messageId, { ...message })
  }

  async update(messageId: string, updates: Partial<MessageData>): Promise<void> {
    const message = this.messages.get(messageId)
    if (message) {
      Object.assign(message, updates)
    }
  }
}

/**
 * In-memory persistence implementation.
 * All data stored in memory, perfect for tests.
 */
export class InMemoryPersistence implements IPersistence {
  private workflows = new Map<string, any>()
  private workflowVersions = new Map<string, any>()
  private invocations = new Map<string, any>()
  public evolution: IEvolutionPersistence
  public nodes: INodePersistence
  public messages: IMessagePersistence

  constructor() {
    this.evolution = new InMemoryEvolutionPersistence()
    this.nodes = new InMemoryNodePersistence()
    this.messages = new InMemoryMessagePersistence()
  }

  async ensureWorkflowExists(workflowId: string, description: string): Promise<void> {
    if (!this.workflows.has(workflowId)) {
      this.workflows.set(workflowId, {
        wf_id: workflowId,
        description,
      })
    }
  }

  async createWorkflowVersion(data: WorkflowVersionData): Promise<void> {
    await this.ensureWorkflowExists(data.workflowId, data.commitMessage)

    this.workflowVersions.set(data.workflowVersionId, {
      wf_version_id: data.workflowVersionId,
      workflow_id: data.workflowId,
      commit_message: data.commitMessage,
      dsl: data.dsl,
      generation_id: data.generationId,
      operation: data.operation || "init",
      parent1_id: data.parent1Id,
      parent2_id: data.parent2Id,
      created_at: new Date().toISOString(),
    })
  }

  async workflowVersionExists(workflowVersionId: string): Promise<boolean> {
    return this.workflowVersions.has(workflowVersionId)
  }

  async ensureWorkflowVersion(
    workflowVersionId: string,
    workflowId: string,
    workflowConfig: unknown,
    generationId: string,
    operation: string,
    goal: string,
  ): Promise<string> {
    if (!this.workflowVersions.has(workflowVersionId)) {
      await this.ensureWorkflowExists(workflowId, goal)
      this.workflowVersions.set(workflowVersionId, {
        wf_version_id: workflowVersionId,
        workflow_id: workflowId,
        commit_message: `GP Best Genome wf_version_id: ${workflowVersionId} (Gen ${generationId})`,
        dsl: workflowConfig,
        operation,
        generation_id: generationId,
        created_at: new Date().toISOString(),
      })
    }
    return workflowVersionId
  }

  async updateWorkflowVersionWithIO(workflowVersionId: string, allWorkflowIO: unknown[]): Promise<void> {
    const version = this.workflowVersions.get(workflowVersionId)
    if (version) {
      version.all_workflow_io = allWorkflowIO
      version.updated_at = new Date().toISOString()
    }
  }

  async createWorkflowInvocation(data: WorkflowInvocationData): Promise<void> {
    this.invocations.set(data.workflowInvocationId, {
      wf_invocation_id: data.workflowInvocationId,
      wf_version_id: data.workflowVersionId,
      status: "running",
      start_time: new Date().toISOString(),
      metadata: data.metadata,
      run_id: data.runId,
      generation_id: data.generationId,
      fitness: data.fitness,
      expected_output_type: data.expectedOutputType,
      workflow_input: data.workflowInput,
      expected_output: data.workflowOutput,
    })
  }

  async updateWorkflowInvocation(data: WorkflowInvocationUpdate): Promise<unknown> {
    const invocation = this.invocations.get(data.workflowInvocationId)
    if (invocation) {
      Object.assign(invocation, data)
      if (data.endTime) invocation.end_time = data.endTime
      if (data.usdCost !== undefined) invocation.usd_cost = data.usdCost
      if (data.accuracy !== undefined) invocation.accuracy = Math.round(data.accuracy)
      if (data.fitnessScore !== undefined) invocation.fitness_score = Math.round(data.fitnessScore)
    }
    return invocation
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
      version.dsl = workflowConfig
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
    return Array.from(this.invocations.values())
  }

  clear() {
    this.workflows.clear()
    this.workflowVersions.clear()
    this.invocations.clear()
  }
}
