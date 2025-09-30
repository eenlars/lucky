// src/core/node/persistence/nodePersistence.ts

import { saveNodeVersionToDB } from "@core/utils/persistence/node/saveNode"
import type { WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"

/**
 * Manages persistence operations for workflow nodes.
 */
export class NodePersistenceManager {
  constructor(
    private readonly nodeId: string,
    private readonly config: WorkflowNodeConfig,
    private memory: Record<string, string> = {},
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
    this.memory = { ...this.memory, ...newMemory }
  }

  /**
   * Updates the config with the current memory state.
   */
  public syncConfigMemory(): WorkflowNodeConfig {
    this.config.memory = this.memory
    return this.config
  }
}
