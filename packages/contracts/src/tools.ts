/**
 * Context provided to tools during execution
 */
export interface ToolExecutionContext {
  workflowInvocationId: string
  workflowId: string
  workflowFiles?: WorkflowFile[]
  expectedOutputType?: any
  mainWorkflowGoal?: string
}

/**
 * File attachment in workflow context
 * References files stored in Supabase storage
 */
export interface WorkflowFile {
  store: "supabase"
  filePath: string // the supabase file path
  summary: string // what the file is about
}

/**
 * Base interface for tool implementations
 */
export interface ITool<TInput = unknown, TOutput = unknown> {
  /** Unique name identifying this tool */
  name: string

  /** Human-readable description of what the tool does */
  description?: string

  /** JSON schema for input parameters */
  inputSchema?: any

  /**
   * Execute the tool with given input and context
   */
  call(input: TInput, ctx: ToolExecutionContext): Promise<TOutput>
}

/**
 * Registry of tools available during workflow execution
 */
export interface ToolRegistry {
  register(tool: ITool): void
  register(tools: ITool[]): void
  get(name: string): ITool | undefined
  getAll(): ITool[]
  has(name: string): boolean
}
