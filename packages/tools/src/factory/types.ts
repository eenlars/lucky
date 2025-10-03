import { R, type RS } from "@lucky/shared"
import type { ZodTypeAny } from "zod"

/**
 * Workflow file reference for tool context
 */
export type WorkflowFile = {
  store: "supabase"
  filePath: string // the supabase file path
  summary: string // what the file is about
}

/**
 * Zod schema representing the expected output type
 */
export type OutputSchema = ZodTypeAny

/**
 * Tool execution context provides runtime information about workflow execution
 * This enables tools to access files, understand goals, and coordinate
 */
export interface ToolExecutionContext {
  workflowId: string
  workflowVersionId: string
  workflowInvocationId: string
  workflowFiles: WorkflowFile[]
  expectedOutputType: OutputSchema | undefined
  mainWorkflowGoal: string
}

/**
 * Alias for ToolExecutionContext
 */
export type InvocationContext = ToolExecutionContext

// RS and R are now imported from @lucky/shared
export type { RS }
export { R }
