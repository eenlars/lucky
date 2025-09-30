// src/core/node/persistence/nodePersistence.ts

import { lgg } from "@core/utils/logging/Logger"
import { saveNodeVersionToDB } from "@core/utils/persistence/node/saveNode"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { CONFIG } from "@core/core-config/compat"

/**
 * Manages persistence operations for workflow nodes.
 */
export class NodePersistenceManager {
  static verbose = CONFIG.logging.override.Memory
  constructor(
    private readonly nodeId: string,
    private readonly config: WorkflowNodeConfig,
    private memory: Record<string, string> = {},
    private readonly skipDatabasePersistence: boolean = false
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
    if (this.skipDatabasePersistence) {
      // Return a mock ID when skipping database operations
      return { nodeVersionId: `mock-${this.nodeId}-${Date.now()}` }
    }

    const { nodeVersionId } = await saveNodeVersionToDB({
      config: this.config,
      workflowVersionId,
    })
    return { nodeVersionId }
  }

  /**
   * Returns the current memory state.
   */
  public getMemory(): Record<string, string> {
    return this.memory
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
