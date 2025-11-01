/**
 * Supabase implementation of the persistence interfaces.
 * Provides both workflow and evolution persistence.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseClient } from "./client"
import { SupabaseEvolutionPersistence } from "./evolution/evolution-persistence"
import { SupabaseMessagePersistence } from "./messages/message-persistence"
import { SupabaseNodePersistence } from "./nodes/node-persistence"
import type {
  CleanupStats,
  DatasetRecord,
  IEvolutionPersistence,
  IMessagePersistence,
  INodePersistence,
  IPersistence,
  WorkflowInvocationData,
  WorkflowInvocationUpdate,
  WorkflowVersionData,
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
  async ensureWorkflowExists(workflowId: string, description: string, clerkId?: string): Promise<void> {
    return this.getWorkflows().ensureWorkflowExists(workflowId, description, clerkId)
  }

  async createWorkflowVersion(data: WorkflowVersionData): Promise<void> {
    return this.getWorkflows().createWorkflowVersion(data)
  }

  async workflowVersionExists(workflowVersionId: string): Promise<boolean> {
    return this.getWorkflows().workflowVersionExists(workflowVersionId)
  }

  async ensureWorkflowVersion(
    workflowVersionId: string,
    workflowId: string,
    workflowConfig: unknown,
    generationId: string,
    operation: string,
    goal: string,
  ): Promise<string> {
    return this.getWorkflows().ensureWorkflowVersion(
      workflowVersionId,
      workflowId,
      workflowConfig,
      generationId,
      operation,
      goal,
    )
  }

  async updateWorkflowVersionWithIO(workflowVersionId: string, allWorkflowIO: unknown[]): Promise<void> {
    return this.getWorkflows().updateWorkflowVersionWithIO(workflowVersionId, allWorkflowIO)
  }

  async createWorkflowInvocation(data: WorkflowInvocationData): Promise<void> {
    return this.getWorkflows().createWorkflowInvocation(data)
  }

  async updateWorkflowInvocation(data: WorkflowInvocationUpdate): Promise<unknown> {
    return this.getWorkflows().updateWorkflowInvocation(data)
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
