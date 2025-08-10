/**
 * Client-side workflow configuration handler
 * Safe for use in browser environments
 */

import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { WorkflowConfigSchema } from "@core/workflow/schema/workflowSchema"

class WorkflowConfigError extends Error {
  constructor(
    message: string,
    public cause?: Error
  ) {
    super(message)
    this.name = "WorkflowConfigError"
  }
}

/**
 * Client-safe workflow loader for browser environments
 */
export class ClientWorkflowLoader {
  /**
   * Normalize workflow config structure
   */
  private normalizeWorkflowConfig(config: any): WorkflowConfig {
    return {
      ...config,
      memory: config.memory || undefined,
      nodes: (config.nodes || []).map((node: any) => ({
        ...node,
        memory: node.memory || undefined,
      })),
    }
  }

  /**
   * Load workflow config from DSL object (client-safe)
   */
  async loadFromDSL(dslConfig: WorkflowConfig): Promise<WorkflowConfig> {
    try {
      const parsedConfig = WorkflowConfigSchema.parse(dslConfig)
      return this.normalizeWorkflowConfig(parsedConfig)
    } catch (error) {
      throw new WorkflowConfigError(
        "Failed to parse DSL config",
        error as Error
      )
    }
  }
}

// Export singleton for convenience
export const clientWorkflowLoader = new ClientWorkflowLoader()

// Export convenience function
export const loadFromDSLClient = (dslConfig: WorkflowConfig) =>
  clientWorkflowLoader.loadFromDSL(dslConfig)
