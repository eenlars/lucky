import { readFile } from "node:fs/promises"
import { loadWorkflowConfig } from "@/lib/mcp-invoke/workflow-loader"
import type { InvocationInput } from "@lucky/core/workflow/runner/types"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"

/**
 * Result of loading workflow configuration
 */
export type WorkflowConfigResult = {
  config: WorkflowConfig | null
  source: "dsl" | "file" | "database" | "none"
}

/**
 * Load workflow configuration from various input sources.
 *
 * Supports three input methods:
 * 1. Direct DSL config (input.dslConfig)
 * 2. File path (input.filename - dev only)
 * 3. Database workflow ID (input.workflowVersionId)
 *
 * @param input - Invocation input containing workflow reference
 * @returns Workflow config and source, or null if not found
 */
export async function loadWorkflowConfigFromInput(input: InvocationInput): Promise<WorkflowConfigResult> {
  try {
    // 1. Direct DSL config (highest priority)
    if (input.dslConfig) {
      return {
        config: input.dslConfig,
        source: "dsl",
      }
    }

    // 2. File path (dev only - security checked at route level)
    if (input.filename) {
      const fileContent = await readFile(input.filename, "utf-8")
      const config = JSON.parse(fileContent) as WorkflowConfig
      return {
        config,
        source: "file",
      }
    }

    // 3. Database workflow ID
    if (input.workflowVersionId) {
      const loadResult = await loadWorkflowConfig(input.workflowVersionId)
      if (loadResult.success && loadResult.config) {
        return {
          config: loadResult.config,
          source: "database",
        }
      }
    }

    // No config source available
    return {
      config: null,
      source: "none",
    }
  } catch (error) {
    console.warn("[config-loader] Failed to load workflow config:", error)
    return {
      config: null,
      source: "none",
    }
  }
}
