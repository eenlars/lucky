/**
 * Client-side workflow configuration handler
 * Safe for use in browser environments
 */

import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { WorkflowConfigSchema, WorkflowConfigSchemaDisplay } from "@core/workflow/schema/workflowSchema"

class WorkflowConfigError extends Error {
  constructor(
    message: string,
    public cause?: Error,
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
      throw new WorkflowConfigError("Failed to parse DSL config", error as Error)
    }
  }

  /**
   * Load workflow config from DSL object with flexible validation for UI display
   */
  async loadFromDSLDisplay(dslConfig: WorkflowConfig): Promise<WorkflowConfig> {
    try {
      const parsedConfig = WorkflowConfigSchemaDisplay.parse(dslConfig)
      return this.normalizeWorkflowConfig(parsedConfig)
    } catch (error) {
      throw new WorkflowConfigError("Failed to parse DSL config", error as Error)
    }
  }
}

// Export singleton for convenience
export const clientWorkflowLoader = new ClientWorkflowLoader()

// Export convenience functions
export const loadFromDSLClient = (dslConfig: WorkflowConfig) => clientWorkflowLoader.loadFromDSL(dslConfig)

export const loadFromDSLClientDisplay = (dslConfig: WorkflowConfig) =>
  clientWorkflowLoader.loadFromDSLDisplay(dslConfig)
