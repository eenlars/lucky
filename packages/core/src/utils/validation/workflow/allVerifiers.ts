import { type WorkflowConfig, isWorkflowConfig } from "@core/workflow/schema/workflow.types"

/**
 * Convert an unknown value to a WorkflowConfig if valid, otherwise return null
 */
export const toWorkflowConfigStatic = (dsl: unknown): WorkflowConfig | null => {
  if (!dsl) return null
  if (isWorkflowConfig(dsl)) return dsl
  return null
}
