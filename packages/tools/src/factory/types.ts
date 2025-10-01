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

/**
 * Result type for tool execution (success or error)
 */
export type RS<T> =
  | {
      success: true
      error?: undefined
      data: T
      usdCost: number | undefined
    }
  | {
      success: false
      error: string
      data?: never
      usdCost: number | undefined
    }

/**
 * Helper for creating RS result objects
 */
export const R: {
  error: (error: string, usdCost: number | undefined) => RS<never>
  success: <T>(data: T, usdCost: number | undefined) => RS<T>
} = {
  error(error: string, usdCost: number | undefined): RS<never> {
    return {
      success: false,
      error,
      usdCost,
    }
  },
  success<T>(data: T, usdCost: number | undefined): RS<T> {
    return {
      success: true,
      data,
      usdCost,
    }
  },
}
