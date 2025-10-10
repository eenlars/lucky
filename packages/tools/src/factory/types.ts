import { R, type RS } from "@lucky/shared"
import type {
  ToolExecutionContext as ToolExecutionContextBase,
  WorkflowFile as WorkflowFileBase,
} from "@lucky/shared/contracts/tools"
import type { ZodTypeAny } from "zod"

/**
 * Re-export contract type for workflow files
 */
export type WorkflowFile = WorkflowFileBase

/**
 * Zod schema representing the expected output type
 */
export type OutputSchema = ZodTypeAny

/**
 * Tool execution context provides runtime information about workflow execution.
 * Extends the base contract with implementation-specific fields.
 */
export interface ToolExecutionContext extends Omit<ToolExecutionContextBase, "expectedOutputType"> {
  workflowId: string
  workflowVersionId: string
  workflowInvocationId: string
  workflowFiles?: WorkflowFile[]
  expectedOutputType?: OutputSchema
  mainWorkflowGoal?: string
}

/**
 * Alias for ToolExecutionContext
 */
export type InvocationContext = ToolExecutionContext

// RS and R are now imported from @lucky/shared
export { R }
export type { RS }
