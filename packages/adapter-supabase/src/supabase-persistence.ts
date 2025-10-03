/**
 * Supabase implementation of the persistence interfaces.
 * Provides both workflow and evolution persistence.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseClient } from "./client"
import { applyFieldMappings } from "./field-mapper"
import { SupabaseMessagePersistence } from "./message-persistence"
import { SupabaseNodePersistence } from "./node-persistence"
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
  PopulationStats,
  RunData,
  WorkflowInvocationData,
  WorkflowInvocationUpdate,
  WorkflowVersionData,
} from "./persistence-interface"

/**
 * Evolution persistence for Supabase.
 * Handles run and generation tracking.
 */
class SupabaseEvolutionPersistence implements IEvolutionPersistence {
  private client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async createRun(data: RunData): Promise<string> {
    const runData = {
      goal_text: data.goalText,
      config: data.config,
      status: data.status,
      start_time: new Date().toISOString(),
      evolution_type: data.evolutionType,
      notes: data.notes,
    }

    const { data: result, error } = await this.client.from("EvolutionRun").insert(runData).select("run_id").single()

    if (error) throw new Error(`Failed to create evolution run: ${error.message}`)
    return result.run_id
  }

  async completeRun(runId: string, status: string, notes?: string): Promise<void> {
    const updateData = {
      status,
      end_time: new Date().toISOString(),
      notes,
    }

    const { error } = await this.client.from("EvolutionRun").update(updateData).eq("run_id", runId)

    if (error) throw new Error(`Failed to complete evolution run: ${error.message}`)
  }

  async createGeneration(data: GenerationData): Promise<string> {
    const generationData = {
      number: data.generationNumber,
      run_id: data.runId,
      start_time: new Date().toISOString(),
    }

    const { data: result, error } = await this.client
      .from("Generation")
      .insert(generationData)
      .select("generation_id")
      .single()

    if (error) throw new Error(`Failed to create generation: ${error.message}`)
    return result.generation_id
  }

  async completeGeneration(update: GenerationUpdate, stats?: PopulationStats): Promise<void> {
    const updateData = {
      end_time: new Date().toISOString(),
      best_workflow_version_id: update.bestWorkflowVersionId,
      comment: stats
        ? `Best: ${stats.bestFitness.toFixed(3)}, Avg: ${stats.avgFitness.toFixed(3)}, Cost: $${stats.evaluationCost.toFixed(2)}`
        : update.comment,
      feedback: update.feedback,
    }

    const { error } = await this.client.from("Generation").update(updateData).eq("generation_id", update.generationId)

    if (error) throw new Error(`Failed to complete generation: ${error.message}`)
  }

  async generationExists(runId: string, generationNumber: number): Promise<boolean> {
    const { data, error } = await this.client
      .from("Generation")
      .select("generation_id")
      .eq("run_id", runId)
      .eq("number", generationNumber)
      .single()

    if (error?.code === "PGRST116") return false // not found
    if (error) throw error
    return !!data
  }

  async getGenerationIdByNumber(runId: string, generationNumber: number): Promise<string | null> {
    const { data, error } = await this.client
      .from("Generation")
      .select("generation_id")
      .eq("run_id", runId)
      .eq("number", generationNumber)
      .single()

    if (error?.code === "PGRST116") return null
    if (error) throw error
    return data.generation_id
  }

  async getLastCompletedGeneration(runId: string): Promise<EvolutionContext | null> {
    const { data, error } = await this.client
      .from("Generation")
      .select("number, generation_id")
      .eq("run_id", runId)
      .not("end_time", "is", null)
      .order("number", { ascending: false })
      .limit(1)
      .single()

    if (error?.code === "PGRST116") return null
    if (error) throw error

    if (!data?.number || !data?.generation_id) return null

    return {
      runId,
      generationNumber: data.number,
      generationId: data.generation_id,
    }
  }
}

/**
 * Main Supabase persistence implementation.
 * Provides workflow persistence and optional evolution support.
 */
export class SupabasePersistence implements IPersistence {
  private client: SupabaseClient | null = null
  private _evolution: IEvolutionPersistence | null = null
  private _nodes: INodePersistence | null = null
  private _messages: IMessagePersistence | null = null

  private getClient(): SupabaseClient {
    if (!this.client) {
      this.client = getSupabaseClient()
    }
    return this.client
  }

  get evolution(): IEvolutionPersistence {
    if (!this._evolution) {
      this._evolution = new SupabaseEvolutionPersistence(this.getClient())
    }
    return this._evolution
  }

  get nodes(): INodePersistence {
    if (!this._nodes) {
      this._nodes = new SupabaseNodePersistence(this.getClient())
    }
    return this._nodes
  }

  get messages(): IMessagePersistence {
    if (!this._messages) {
      this._messages = new SupabaseMessagePersistence(this.getClient())
    }
    return this._messages
  }

  async ensureWorkflowExists(workflowId: string, description: string): Promise<void> {
    const workflowInsertable = {
      wf_id: workflowId,
      description,
    }

    const { error } = await this.getClient().from("Workflow").upsert(workflowInsertable)

    if (error) throw new Error(`Failed to upsert workflow: ${error.message}`)
  }

  async createWorkflowVersion(data: WorkflowVersionData): Promise<void> {
    await this.ensureWorkflowExists(data.workflowId, data.commitMessage)

    const workflowVersionInsertable = {
      wf_version_id: data.workflowVersionId,
      workflow_id: data.workflowId,
      commit_message: data.commitMessage,
      dsl: data.dsl,
      iteration_budget: 10,
      time_budget_seconds: 3600,
      generation_id: data.generationId || null,
      operation: data.operation || "init",
      parent1_id: data.parent1Id || null,
      parent2_id: data.parent2Id || null,
    }

    const { error } = await this.getClient()
      .from("WorkflowVersion")
      .upsert(workflowVersionInsertable, { onConflict: "wf_version_id" })

    if (error) throw new Error(`Failed to upsert workflow version: ${error.message}`)
  }

  async workflowVersionExists(workflowVersionId: string): Promise<boolean> {
    const { data, error } = await this.getClient()
      .from("WorkflowVersion")
      .select("wf_version_id")
      .eq("wf_version_id", workflowVersionId)
      .single()

    if (error?.code === "PGRST116") return false
    if (error) throw error
    return !!data
  }

  async ensureWorkflowVersion(
    workflowVersionId: string,
    workflowId: string,
    workflowConfig: unknown,
    generationId: string,
    operation: string,
    goal: string,
  ): Promise<string> {
    // Check if already exists
    const { data: existing } = await this.getClient()
      .from("WorkflowVersion")
      .select("wf_version_id")
      .eq("wf_version_id", workflowVersionId)
      .single()

    if (existing) return workflowVersionId

    // Ensure workflow exists first
    await this.ensureWorkflowExists(workflowId, goal)

    // Create workflow version
    const workflowVersionInsertable = {
      wf_version_id: workflowVersionId,
      workflow_id: workflowId,
      commit_message: `GP Best Genome wf_version_id: ${workflowVersionId} (Gen ${generationId})`,
      dsl: workflowConfig,
      iteration_budget: 10,
      time_budget_seconds: 3600,
      operation: operation,
      generation_id: generationId,
    }

    const { error } = await this.getClient().from("WorkflowVersion").insert(workflowVersionInsertable)

    if (error) throw new Error(`Failed to ensure workflow version: ${error.message}`)
    return workflowVersionId
  }

  async updateWorkflowVersionWithIO(workflowVersionId: string, allWorkflowIO: unknown[]): Promise<void> {
    // ensure JSON-serializable data
    const jsonSafeWorkflowIO = allWorkflowIO.map((io: any) => {
      const output = io.workflowOutput?.output
      let jsonSafeOutput: unknown = null
      try {
        jsonSafeOutput = JSON.parse(JSON.stringify(output ?? null))
      } catch {
        jsonSafeOutput = typeof output === "string" ? output : String(output)
      }

      return {
        workflowInput: io.workflowInput,
        workflowOutput: {
          output: jsonSafeOutput,
        },
      }
    })

    const updateData = {
      all_workflow_io: jsonSafeWorkflowIO,
      updated_at: new Date().toISOString(),
    }

    const { error } = await this.getClient()
      .from("WorkflowVersion")
      .update(updateData)
      .eq("wf_version_id", workflowVersionId)

    if (error) throw new Error(`Failed to update workflow version with IO: ${error.message}`)
  }

  async createWorkflowInvocation(data: WorkflowInvocationData): Promise<void> {
    const workflowInvocationInsertable = {
      wf_invocation_id: data.workflowInvocationId,
      wf_version_id: data.workflowVersionId,
      status: "running",
      start_time: new Date().toISOString(),
      end_time: null,
      usd_cost: 0,
      extras: {},
      metadata: data.metadata || {},
      run_id: data.runId || null,
      generation_id: data.generationId || null,
      fitness: data.fitness || null,
      evaluation_inputs: null,
      expected_output_type: data.expectedOutputType || null,
      workflow_input: data.workflowInput || null,
      expected_output:
        typeof data.workflowOutput === "string" ? data.workflowOutput : JSON.stringify(data.workflowOutput) || null,
    }

    const { error } = await this.getClient().from("WorkflowInvocation").insert(workflowInvocationInsertable)

    if (error) throw new Error(`Failed to insert workflow invocation: ${error.message}`)
  }

  async updateWorkflowInvocation(data: WorkflowInvocationUpdate): Promise<unknown> {
    const { workflowInvocationId, fitnessScore, ...otherFields } = data

    // Build the update payload with proper field names
    const updatePayload: any = { ...otherFields }

    // Ensure integer columns are saved as integers
    if (typeof updatePayload.accuracy === "number") {
      updatePayload.accuracy = Math.round(updatePayload.accuracy)
    }

    // Handle fitnessScore -> fitness_score rename without using delete
    if (typeof fitnessScore === "number") {
      updatePayload.fitness_score = Math.round(fitnessScore)
    }

    const { data: result, error } = await this.getClient()
      .from("WorkflowInvocation")
      .update(updatePayload)
      .eq("wf_invocation_id", workflowInvocationId)
      .select()
      .single()

    if (error) throw new Error(`Failed to update workflow invocation: ${error.message}`)
    return result
  }

  async getWorkflowVersion(workflowVersionId: string): Promise<string | null> {
    const { data, error } = await this.getClient()
      .from("WorkflowVersion")
      .select("wf_version_id")
      .eq("wf_version_id", workflowVersionId)
      .maybeSingle()

    if (error) throw new Error(`Failed to get workflow version: ${error.message}`)
    return data?.wf_version_id ?? null
  }

  async loadWorkflowConfig(workflowVersionId: string): Promise<unknown> {
    const { data, error } = await this.getClient()
      .from("WorkflowVersion")
      .select("dsl")
      .eq("wf_version_id", workflowVersionId)
      .single()

    if (error || !data) {
      throw new Error(`Workflow version ${workflowVersionId} not found: ${error?.message}`)
    }

    return data.dsl
  }

  async loadWorkflowConfigForDisplay(workflowVersionId: string): Promise<unknown> {
    // Same as loadWorkflowConfig but allows legacy model names
    return this.loadWorkflowConfig(workflowVersionId)
  }

  async loadLatestWorkflowConfig(workflowId?: string): Promise<unknown> {
    let query = this.getClient().from("WorkflowVersion").select("dsl")

    if (workflowId) {
      query = query.eq("workflow_id", workflowId)
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle()

    if (error) throw new Error(`Failed to load latest workflow config: ${error.message}`)
    return data?.dsl ?? null
  }

  async updateWorkflowMemory(workflowVersionId: string, workflowConfig: unknown): Promise<void> {
    const { error } = await this.getClient()
      .from("WorkflowVersion")
      .update({ dsl: workflowConfig })
      .eq("wf_version_id", workflowVersionId)

    if (error) throw new Error(`Failed to update workflow memory: ${error.message}`)
  }

  async loadDatasetRecords(recordIds: string[]): Promise<DatasetRecord[]> {
    const { data, error } = await this.getClient().from("DatasetRecord").select("*").in("dataset_record_id", recordIds)

    if (error) throw new Error(`Failed to fetch dataset records: ${error.message}`)
    if (!data || data.length === 0) {
      throw new Error(`No dataset records found for IDs: ${recordIds.join(", ")}`)
    }

    return data
  }

  async cleanupStaleRecords(): Promise<CleanupStats> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const stats: CleanupStats = {
      workflowInvocations: 0,
      nodeInvocations: 0,
      evolutionRuns: 0,
      generations: 0,
      messages: 0,
      evolutionRunsEndTimes: 0,
    }

    try {
      // Cleanup stale workflow invocations
      const { data: staleWorkflows, error: workflowError } = await this.getClient()
        .from("WorkflowInvocation")
        .update({ status: "failed" })
        .eq("status", "running")
        .lt("start_time", tenMinutesAgo)
        .select("wf_invocation_id")

      if (!workflowError) {
        stats.workflowInvocations = staleWorkflows?.length || 0
      }

      // Cleanup stale node invocations
      const { data: staleNodes, error: nodeError } = await this.getClient()
        .from("NodeInvocation")
        .update({ status: "failed" })
        .eq("status", "running")
        .lt("start_time", tenMinutesAgo)
        .select("node_invocation_id")

      if (!nodeError) {
        stats.nodeInvocations = staleNodes?.length || 0
      }

      // Update evolution runs end times
      const { data: runs, error: runError } = await this.getClient()
        .from("EvolutionRun")
        .update({ end_time: new Date().toISOString() })
        .eq("status", "running")
        .is("end_time", null)
        .lt("start_time", tenMinutesAgo)
        .select("run_id")

      if (!runError) {
        stats.evolutionRunsEndTimes = runs?.length || 0
      }

      // Cleanup stale evolution runs
      const { data: staleRuns, error: staleRunError } = await this.getClient()
        .from("EvolutionRun")
        .update({ status: "failed" })
        .eq("status", "running")
        .lt("start_time", tenMinutesAgo)
        .select("run_id")

      if (!staleRunError) {
        stats.evolutionRuns = staleRuns?.length || 0
      }

      // Cleanup stale generations
      const { data: staleGenerations, error: genError } = await this.getClient()
        .from("Generation")
        .update({ end_time: new Date().toISOString() })
        .is("end_time", null)
        .lt("start_time", tenMinutesAgo)
        .select("generation_id")

      if (!genError) {
        stats.generations = staleGenerations?.length || 0
      }

      // Cleanup old messages
      const { data: oldMessages, error: msgError } = await this.getClient()
        .from("Message")
        .delete()
        .lt("timestamp", tenMinutesAgo)
        .select("message_id")

      if (!msgError) {
        stats.messages = oldMessages?.length || 0
      }
    } catch (error) {
      console.error("Error during cleanup:", error)
    }

    return stats
  }
}
