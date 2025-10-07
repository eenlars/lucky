import type { AnyModelName } from "@core/utils/spending/models.types"
import type { ToolsInformation } from "@core/utils/validation/workflow/toolInformation"
import type {
  WorkflowConfig as WorkflowConfigBase,
  WorkflowNodeConfig as WorkflowNodeConfigBase,
} from "@lucky/contracts/workflow"
import type { CodeToolName, MCPToolName } from "@lucky/tools"

// Import SDK config type - can be removed cleanly when ejecting SDK
// @sdk-import - marker for easy removal
import type { ClaudeSDKConfig } from "@core/tools/claude-sdk/types"

/**
 * Declarative configuration for a single workflow node.
 * Extends the base contract with specific types for models and tools.
 */
export interface WorkflowNodeConfig
  extends Omit<WorkflowNodeConfigBase, "modelName" | "mcpTools" | "codeTools" | "sdkConfig"> {
  modelName: AnyModelName
  mcpTools: MCPToolName[]
  codeTools: CodeToolName[]
  sdkConfig?: ClaudeSDKConfig // SDK-specific configuration
}

/**
 * WorkflowConfig extends the base contract with implementation-specific types.
 */
export interface WorkflowConfig extends Omit<WorkflowConfigBase, "nodes" | "toolsInformation"> {
  nodes: WorkflowNodeConfig[]
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
