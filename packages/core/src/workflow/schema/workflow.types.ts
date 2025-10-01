import type { CodeToolName, MCPToolName } from "@lucky/tools"
import type { AnyModelName } from "@core/utils/spending/models.types"
import type { ToolsInformation } from "@core/utils/validation/workflow/toolInformation"

// Import SDK config type - can be removed cleanly when ejecting SDK
// @sdk-import - marker for easy removal
import type { ClaudeSDKConfig } from "@core/tools/claude-sdk/types"

/**
 * Declarative configuration for a single workflow node.
 * modelName accepts any model from any provider - validation happens at runtime
 */
export interface WorkflowNodeConfig {
  nodeId: string
  description: string
  systemPrompt: string
  modelName: AnyModelName
  mcpTools: MCPToolName[]
  codeTools: CodeToolName[]
  handOffs: string[]
  memory?: Record<string, string> | null
  waitingFor?: string[]
  waitFor?: string[] // Alternative name for waitingFor, both are supported
  handOffType?: "conditional" | "sequential" | "parallel"
  useClaudeSDK?: boolean // Enable Claude Code SDK for this node
  sdkConfig?: ClaudeSDKConfig // SDK-specific configuration
}

/**
 * WorkflowConfig defines workflow structure with nodes, handoffs and metadata.
 */
export interface WorkflowConfig {
  nodes: WorkflowNodeConfig[]
  entryNodeId: string
  contextFile?: string | null
  memory?: Record<string, string> | null
  toolsInformation?: ToolsInformation
}

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

  // contextFile is optional
  if (obj.contextFile !== undefined && typeof obj.contextFile !== "string") return false

  return true
}

export const toWorkflowConfig = (dsl: unknown): WorkflowConfig | null => {
  if (!dsl) return null
  if (isWorkflowConfig(dsl)) return dsl
  return null
}
