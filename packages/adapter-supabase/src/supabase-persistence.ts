/**
 * Supabase implementation of the persistence interfaces.
 * Provides both workflow and evolution persistence.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseClient } from "./client"
import { SupabaseEvolutionPersistence } from "./evolution/evolution-persistence"
import { SupabaseMessagePersistence } from "./messages/message-persistence"
import { SupabaseNodePersistence } from "./nodes/node-persistence"
import type { TablesInsert, TablesUpdate, Tables } from "@lucky/shared"
import type {
  CleanupStats,
  DatasetRecord,
  IEvolutionPersistence,
  IMessagePersistence,
  INodePersistence,
  IPersistence,
} from "./persistence-interface"
import { SupabaseWorkflowPersistence } from "./workflows/workflow-persistence"

/**
 * Main Supabase persistence implementation.
 * Provides workflow persistence and optional evolution support.
 */
export class SupabasePersistence implements IPersistence {
  private client: SupabaseClient | null = null
  private _evolution: IEvolutionPersistence | null = null
  private _nodes: INodePersistence | null = null
  private _messages: IMessagePersistence | null = null
  private _workflows: SupabaseWorkflowPersistence | null = null

  private getClient(): SupabaseClient {
    if (!this.client) {
      this.client = getSupabaseClient()
    }
    return this.client
  }

  private getWorkflows(): SupabaseWorkflowPersistence {
    if (!this._workflows) {
      this._workflows = new SupabaseWorkflowPersistence(this.getClient())
    }
    return this._workflows
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

  // Delegate all workflow methods to SupabaseWorkflowPersistence
  async ensureWorkflowExists(workflowId: string, description: string): Promise<void> {
    return this.getWorkflows().ensureWorkflowExists(workflowId, description)
  }

  async createWorkflowVersion(data: TablesInsert<"WorkflowVersion">): Promise<void> {
    return this.getWorkflows().createWorkflowVersion(data)
  }

  async workflowVersionExists(workflowVersionId: string): Promise<boolean> {
    return this.getWorkflows().workflowVersionExists(workflowVersionId)
  }

  async ensureWorkflowVersion(data: Tables<"WorkflowVersion">): Promise<void> {
    // Convert Tables row to TablesInsert for the workflow persistence layer
    const insertData: TablesInsert<"WorkflowVersion"> = {
      wf_version_id: data.wf_version_id,
      workflow_id: data.workflow_id,
      commit_message: data.commit_message,
      dsl: data.dsl,
      generation_id: data.generation_id,
      operation: data.operation as TablesInsert<"WorkflowVersion">["operation"],
      iteration_budget: data.iteration_budget,
      time_budget_seconds: data.time_budget_seconds,
      input_schema: data.input_schema,
      knowledge: data.knowledge,
    }
    return this.getWorkflows().createWorkflowVersion(insertData)
  }

  async updateWorkflowVersionWithIO(workflowVersionId: string, allWorkflowIO: unknown[]): Promise<void> {
    return this.getWorkflows().updateWorkflowVersionWithIO(workflowVersionId, allWorkflowIO)
  }

  async createWorkflowInvocation(data: Tables<"WorkflowInvocation">): Promise<void> {
    // Convert Tables row to TablesInsert for the workflow persistence layer
    const insertData: TablesInsert<"WorkflowInvocation"> = {
      wf_invocation_id: data.wf_invocation_id,
      wf_version_id: data.wf_version_id,
      status: data.status as TablesInsert<"WorkflowInvocation">["status"],
      start_time: data.start_time,
      end_time: data.end_time,
      usd_cost: data.usd_cost,
      extras: data.extras,
      run_id: data.run_id,
      generation_id: data.generation_id,
      fitness: data.fitness,
      workflow_input: data.workflow_input,
      workflow_output: data.workflow_output,
    }
    return this.getWorkflows().createWorkflowInvocation(insertData)
  }

  async updateWorkflowInvocation(data: TablesUpdate<"WorkflowInvocation">): Promise<void> {
    await this.getWorkflows().updateWorkflowInvocation(data)
  }

  async getWorkflowVersion(workflowVersionId: string): Promise<string | null> {
    return this.getWorkflows().getWorkflowVersion(workflowVersionId)
  }

  async loadWorkflowConfig(workflowVersionId: string): Promise<unknown> {
    return this.getWorkflows().loadWorkflowConfig(workflowVersionId)
  }

  async loadWorkflowConfigForDisplay(workflowVersionId: string): Promise<unknown> {
    return this.getWorkflows().loadWorkflowConfigForDisplay(workflowVersionId)
  }

  async loadLatestWorkflowConfig(workflowId?: string): Promise<unknown> {
    return this.getWorkflows().loadLatestWorkflowConfig(workflowId)
  }

  async updateWorkflowMemory(workflowVersionId: string, workflowConfig: unknown): Promise<void> {
    return this.getWorkflows().updateWorkflowMemory(workflowVersionId, workflowConfig)
  }

  async loadDatasetRecords(recordIds: string[]): Promise<DatasetRecord[]> {
    return this.getWorkflows().loadDatasetRecords(recordIds)
  }

  async cleanupStaleRecords(): Promise<CleanupStats> {
    return this.getWorkflows().cleanupStaleRecords()
  }
}
