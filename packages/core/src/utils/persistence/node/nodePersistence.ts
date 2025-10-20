// src/core/node/persistence/nodePersistence.ts

import { isLoggingEnabled } from "@core/core-config/coreConfig"
import { lgg } from "@core/utils/logging/Logger"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import type { IPersistence } from "@lucky/adapter-supabase"
import type { TablesInsert } from "@lucky/shared"

/**
 * Manages persistence operations for workflow nodes.
 */
export class NodePersistenceManager {
  static verbose = isLoggingEnabled("Database")
  constructor(
    private readonly nodeId: string,
    private readonly config: WorkflowNodeConfig,
    private memory: Record<string, string> = {},
    private readonly skipDatabasePersistence: boolean = false,
    private readonly persistence?: IPersistence,
  ) {
    // Initialize memory from config
    this.memory = { ...(config.memory ?? {}) }
  }

  /**
   * Records initial node metadata in the database.
   */
  public async registerNode(workflowVersionId: string): Promise<{
    nodeVersionId: string
  }> {
    if (this.skipDatabasePersistence || !this.persistence) {
      // Return a mock ID when skipping database operations
      return { nodeVersionId: `mock-${this.nodeId}-${Date.now()}` }
    }

    // Use persistence instead of direct supabase call
    const nodeVersionData: TablesInsert<"NodeVersion"> = {
      node_id: this.nodeId,
      wf_version_id: workflowVersionId,
      llm_model: this.config.modelName,
      system_prompt: this.config.systemPrompt,
      tools: this.config.codeTools as any,
      description: this.config.description,
      memory: this.config.memory as any,
      handoffs: this.config.handOffs as any,
      extras: {},
      version: 1,
    }
    const { nodeVersionId } = await this.persistence.nodes.saveNodeVersion(nodeVersionData)
    return { nodeVersionId }
  }

  /**
   * Returns the current memory state.
   */
  public getMemory(): Record<string, string> {
    return this.memory
  }

  /**
   * Returns the persistence adapter instance.
   */
  public getPersistence(): IPersistence | undefined {
    return this.persistence
  }

  /**
   * Updates the memory with new entries.
   */
  public updateMemory(newMemory: Record<string, string>): void {
    const oldMemory = { ...this.memory }
    this.memory = { ...this.memory, ...newMemory }

    // Log memory updates for debugging
    const hasChanges = JSON.stringify(oldMemory) !== JSON.stringify(this.memory)
    if (hasChanges && NodePersistenceManager.verbose) {
      lgg.log(`[NodePersistence] Memory updated for node ${this.nodeId}:`, {
        old: oldMemory,
        new: this.memory,
      })
    }
  }

  /**
   * Updates the config with the current memory state.
   */
  public syncConfigMemory(): WorkflowNodeConfig {
    this.config.memory = this.memory
    return this.config
  }
}
