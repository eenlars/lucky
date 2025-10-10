import { isWorkflowConfig } from "@core/workflow/schema/workflow.types"
import type { WorkflowConfig } from "@lucky/shared/contracts/workflow"

/**
 * Convert an unknown value to a WorkflowConfig if valid, otherwise return null
 */
export const toWorkflowConfigStatic = (dsl: unknown): WorkflowConfig | null => {
  if (!dsl) return null
  if (isWorkflowConfig(dsl)) return dsl
  return null
}
