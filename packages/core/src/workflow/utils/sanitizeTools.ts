import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import {
  ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT,
  ACTIVE_MCP_TOOL_NAMES,
  type CodeToolName,
  type MCPToolName,
} from "@lucky/tools"

/**
 * Remove any inactive or unknown tools from the workflow config.
 * Does not mutate the input.
 */
export function sanitizeConfigTools(config: WorkflowConfig): WorkflowConfig {
  const mcpAllowed = new Set(ACTIVE_MCP_TOOL_NAMES)
  const codeAllowed = new Set(ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT)

  const sanitizedNodes: WorkflowNodeConfig[] = config.nodes.map(node => {
    const nextMcp = (Array.isArray(node.mcpTools) ? node.mcpTools : []).filter((t): t is MCPToolName =>
      mcpAllowed.has(t as MCPToolName),
    )
    const nextCode = (Array.isArray(node.codeTools) ? node.codeTools : []).filter((t): t is CodeToolName =>
      codeAllowed.has(t as CodeToolName),
    )

    return {
      ...node,
      mcpTools: nextMcp,
      codeTools: nextCode,
    }
  })

  return {
    ...config,
    nodes: sanitizedNodes,
  }
}
