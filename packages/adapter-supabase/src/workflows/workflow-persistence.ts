/**
 * Workflow persistence for Supabase.
 * Handles workflow versions, invocations, and config management.
 */

import { CURRENT_SCHEMA_VERSION } from "@lucky/contracts/workflow"
import type { SupabaseClient } from "@supabase/supabase-js"
import { DatasetRecordNotFoundError, PersistenceError, WorkflowNotFoundError } from "../errors/domain-errors"
import type {
  CleanupStats,
  DatasetRecord,
  WorkflowInvocationData,
  WorkflowInvocationUpdate,
  WorkflowVersionData,
} from "../persistence-interface"

export class SupabaseWorkflowPersistence {
  constructor(private client: SupabaseClient) {}

  async ensureWorkflowExists(workflowId: string, description: string): Promise<void> {
    const workflowInsertable = {
      wf_id: workflowId,
      description,
    }

    const { error } = await this.client.from("Workflow").upsert(workflowInsertable)

    if (error) {
      throw new PersistenceError(`Failed to upsert workflow: ${error.message}`, error)
    }
  }

  async createWorkflowVersion(data: WorkflowVersionData): Promise<void> {
    await this.ensureWorkflowExists(data.workflowId, data.commitMessage)

    // Ensure DSL includes schema version
    const dslWithVersion = this.ensureSchemaVersion(data.dsl)

    const workflowVersionInsertable = {
      wf_version_id: data.workflowVersionId,
      workflow_id: data.workflowId,
      commit_message: data.commitMessage,
      dsl: dslWithVersion,
      iteration_budget: 10,
      time_budget_seconds: 3600,
      generation_id: data.generationId || null,
      operation: data.operation || "init",
      parent1_id: data.parent1Id || null,
      parent2_id: data.parent2Id || null,
    }

    const { error } = await this.client
      .from("WorkflowVersion")
      .upsert(workflowVersionInsertable, { onConflict: "wf_version_id" })

    if (error) {
      throw new PersistenceError(`Failed to upsert workflow version: ${error.message}`, error)
    }
  }

  /**
   * Ensure workflow config has __schema_version set to current version.
   * This is called when saving workflows to database.
   */
  private ensureSchemaVersion(dsl: any): any {
    if (typeof dsl !== "object" || dsl === null) {
      return dsl
    }

    return {
      ...dsl,
      __schema_version: dsl.__schema_version ?? CURRENT_SCHEMA_VERSION,
    }
  }

  async workflowVersionExists(workflowVersionId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from("WorkflowVersion")
      .select("wf_version_id")
      .eq("wf_version_id", workflowVersionId)
      .maybeSingle()

    if (error) {
      throw new PersistenceError(`Failed to check workflow version existence: ${error.message}`, error)
    }
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
    const { data: existing } = await this.client
      .from("WorkflowVersion")
      .select("wf_version_id")
      .eq("wf_version_id", workflowVersionId)
      .maybeSingle()

    if (existing) return workflowVersionId

    // Ensure workflow exists first
    await this.ensureWorkflowExists(workflowId, goal)

    // Ensure DSL includes schema version
    const dslWithVersion = this.ensureSchemaVersion(workflowConfig)

    // Create workflow version
    const workflowVersionInsertable = {
      wf_version_id: workflowVersionId,
      workflow_id: workflowId,
      commit_message: `GP Best Genome wf_version_id: ${workflowVersionId} (Gen ${generationId})`,
      dsl: dslWithVersion,
      iteration_budget: 10,
      time_budget_seconds: 3600,
      operation,
      generation_id: generationId,
    }

    const { error } = await this.client.from("WorkflowVersion").insert(workflowVersionInsertable)

    if (error) {
      throw new PersistenceError(`Failed to ensure workflow version: ${error.message}`, error)
    }
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

    const { error } = await this.client
      .from("WorkflowVersion")
      .update(updateData)
      .eq("wf_version_id", workflowVersionId)

    if (error) {
      throw new PersistenceError(`Failed to update workflow version with IO: ${error.message}`, error)
    }
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

    const { error } = await this.client.from("WorkflowInvocation").insert(workflowInvocationInsertable)

    if (error) {
      throw new PersistenceError(`Failed to insert workflow invocation: ${error.message}`, error)
    }
  }

  async updateWorkflowInvocation(data: WorkflowInvocationUpdate): Promise<unknown> {
    const { workflowInvocationId, fitnessScore, ...otherFields } = data

    // Build the update payload with proper field names
    const updatePayload: any = { ...otherFields }

    // Ensure integer columns are saved as integers
    if (typeof updatePayload.accuracy === "number") {
      updatePayload.accuracy = Math.round(updatePayload.accuracy)
    }

    // Handle fitnessScore -> fitness_score rename
    if (typeof fitnessScore === "number") {
      updatePayload.fitness_score = Math.round(fitnessScore)
    }

    const { data: result, error } = await this.client
      .from("WorkflowInvocation")
      .update(updatePayload)
      .eq("wf_invocation_id", workflowInvocationId)
      .select()
      .single()

    if (error) {
      throw new PersistenceError(`Failed to update workflow invocation: ${error.message}`, error)
    }
    return result
  }

  async getWorkflowVersion(workflowVersionId: string): Promise<string | null> {
    const { data, error } = await this.client
      .from("WorkflowVersion")
      .select("wf_version_id")
      .eq("wf_version_id", workflowVersionId)
      .maybeSingle()

    if (error) {
      throw new PersistenceError(`Failed to get workflow version: ${error.message}`, error)
    }
    return data?.wf_version_id ?? null
  }

  async loadWorkflowConfig(workflowVersionId: string): Promise<unknown> {
    const { data, error } = await this.client
      .from("WorkflowVersion")
      .select("dsl")
      .eq("wf_version_id", workflowVersionId)
      .maybeSingle()

    if (error) {
      throw new PersistenceError(`Failed to load workflow config: ${error.message}`, error)
    }

    if (!data) {
      throw new WorkflowNotFoundError(workflowVersionId)
    }

    return data.dsl
  }

  async loadWorkflowConfigForDisplay(workflowVersionId: string): Promise<unknown> {
    // Same as loadWorkflowConfig but allows legacy model names
    return this.loadWorkflowConfig(workflowVersionId)
  }

  async loadLatestWorkflowConfig(workflowId?: string): Promise<unknown> {
    let query = this.client.from("WorkflowVersion").select("dsl")

    if (workflowId) {
      query = query.eq("workflow_id", workflowId)
    }

    const { data, error } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle()

    if (error) {
      throw new PersistenceError(`Failed to load latest workflow config: ${error.message}`, error)
    }
    return data?.dsl ?? null
  }

  async updateWorkflowMemory(workflowVersionId: string, workflowConfig: unknown): Promise<void> {
    // Ensure DSL includes schema version
    const dslWithVersion = this.ensureSchemaVersion(workflowConfig)

    const { error } = await this.client
      .from("WorkflowVersion")
      .update({ dsl: dslWithVersion })
      .eq("wf_version_id", workflowVersionId)

    if (error) {
      throw new PersistenceError(`Failed to update workflow memory: ${error.message}`, error)
    }
  }

  async loadDatasetRecords(recordIds: string[]): Promise<DatasetRecord[]> {
    const { data, error } = await this.client.from("DatasetRecord").select("*").in("dataset_record_id", recordIds)

    if (error) {
      throw new PersistenceError(`Failed to fetch dataset records: ${error.message}`, error)
    }
    if (!data || data.length === 0) {
      throw new DatasetRecordNotFoundError(recordIds)
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
      // cleanup stale workflow invocations
      const { data: staleWorkflows } = await this.client
        .from("WorkflowInvocation")
        .update({ status: "failed" })
        .eq("status", "running")
        .lt("start_time", tenMinutesAgo)
        .select("wf_invocation_id")

      stats.workflowInvocations = staleWorkflows?.length || 0

      // cleanup stale node invocations
      const { data: staleNodes } = await this.client
        .from("NodeInvocation")
        .update({ status: "failed" })
        .eq("status", "running")
        .lt("start_time", tenMinutesAgo)
        .select("node_invocation_id")

      stats.nodeInvocations = staleNodes?.length || 0

      // update evolution runs end times
      const { data: runs } = await this.client
        .from("EvolutionRun")
        .update({ end_time: new Date().toISOString() })
        .eq("status", "running")
        .is("end_time", null)
        .lt("start_time", tenMinutesAgo)
        .select("run_id")

      stats.evolutionRunsEndTimes = runs?.length || 0

      // cleanup stale evolution runs
      const { data: staleRuns } = await this.client
        .from("EvolutionRun")
        .update({ status: "failed" })
        .eq("status", "running")
        .lt("start_time", tenMinutesAgo)
        .select("run_id")

      stats.evolutionRuns = staleRuns?.length || 0

      // cleanup stale generations
      const { data: staleGenerations } = await this.client
        .from("Generation")
        .update({ end_time: new Date().toISOString() })
        .is("end_time", null)
        .lt("start_time", tenMinutesAgo)
        .select("generation_id")

      stats.generations = staleGenerations?.length || 0

      // cleanup old messages
      const { data: oldMessages } = await this.client
        .from("Message")
        .delete()
        .lt("timestamp", tenMinutesAgo)
        .select("message_id")

      stats.messages = oldMessages?.length || 0
    } catch (error) {
      // surface cleanup errors but return partial stats
      throw new PersistenceError(
        `Cleanup failed with partial stats: ${JSON.stringify(stats)}`,
        error instanceof Error ? error : undefined,
      )
    }

    return stats
  }
}
