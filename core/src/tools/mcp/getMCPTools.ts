import type { MCPToolName } from "@core/tools/tool.types"
import { ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION } from "@core/tools/tool.types"

interface MCPToolInfo {
  name: MCPToolName
  description: string
}

/**
 * Get all available MCP tools with their descriptions
 */
export function getMCPTools(): MCPToolInfo[] {
  return Object.entries(ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION).map(
    ([name, description]) => ({
      name: name as MCPToolName,
      description,
    })
  )
}