/**
 * Declarative configuration for a single workflow node.
 * modelName accepts any model from any provider - validation happens at runtime
 */
export interface WorkflowNodeConfig {
  nodeId: string
  description: string
  systemPrompt: string
  modelName: string // AnyModelName - string for now to avoid circular deps
  mcpTools: string[] // MCPToolName[] - string[] for now
  codeTools: string[] // CodeToolName[] - string[] for now
  handOffs: string[]
  memory?: Record<string, string> | null
  waitingFor?: string[]
  waitFor?: string[] // Alternative name for waitingFor, both are supported
  handOffType?: "conditional" | "sequential" | "parallel"
  useClaudeSDK?: boolean // Enable Claude Code SDK for this node
  sdkConfig?: any // ClaudeSDKConfig - any for now to avoid circular deps
}

/**
 * JSON Schema definition for workflow input/output validation
 */
export interface JsonSchemaDefinition {
  type: "object" | "string" | "number" | "boolean" | "array"
  properties?: Record<string, any>
  required?: string[]
  items?: any
  description?: string
}

/**
 * Current schema version - increment this when making breaking changes to WorkflowConfig
 */
export const CURRENT_SCHEMA_VERSION = 1

/**
 * WorkflowConfig defines workflow structure with nodes, handoffs and metadata.
 */
export interface WorkflowConfig {
  __schema_version?: number // Schema version for migration (0 = legacy, 1+ = versioned)
  nodes: WorkflowNodeConfig[]
  entryNodeId: string
  contextFile?: string | null
  memory?: Record<string, string> | null
  toolsInformation?: any // ToolsInformation - any for now
  inputSchema?: JsonSchemaDefinition // Schema for validating external invocation inputs
  outputSchema?: OutputSchema // Schema for workflow output
}

/**
 * Type guard to check if an unknown value is a valid WorkflowConfig
 */
export const isWorkflowConfig = (config: unknown): config is WorkflowConfig => {
  if (typeof config !== "object" || config === null) return false

  const obj = config as WorkflowConfig

  // check if nodes array exists and is array
  if (!Array.isArray(obj.nodes)) return false

  // check each node
  for (const node of obj.nodes) {
    if (typeof node !== "object" || node === null) return false
    if (typeof node.nodeId !== "string") return false
    if (typeof node.description !== "string") return false
    if (typeof node.systemPrompt !== "string") return false
    if (typeof node.modelName !== "string") return false
    if (!Array.isArray(node.mcpTools)) return false
    if (!Array.isArray(node.codeTools)) return false
    if (!Array.isArray(node.handOffs)) return false
  }

  // check entryNodeId
  if (typeof obj.entryNodeId !== "string") return false

  // contextFile is optional and can be null
  if (obj.contextFile !== undefined && obj.contextFile !== null && typeof obj.contextFile !== "string") return false

  return true
}

/**
 * Convert an unknown value to a WorkflowConfig if valid, otherwise return null
 */
export const toWorkflowConfig = (dsl: unknown): WorkflowConfig | null => {
  if (!dsl) return null
  if (isWorkflowConfig(dsl)) return dsl
  return null
}

/**
 * Output schema for workflow results
 * @deprecated Use JsonSchemaDefinition instead
 */
export interface OutputSchema {
  type: "object" | "string" | "array"
  properties?: Record<string, any>
  required?: string[]
  description?: string
}
