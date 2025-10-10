import {
  type AllToolNames,
  type CodeToolName,
  DEFAULT_INACTIVE_TOOLS,
  type MCPToolName,
  TOOLS,
} from "@lucky/contracts/tools"

const INACTIVE_TOOLS = DEFAULT_INACTIVE_TOOLS
const DEFAULT_TOOLS: AllToolNames[] = []

export const getActiveTools = <T extends Record<string, any>>(tools: T, includeDefault = false): T => {
  if (INACTIVE_TOOLS.length === 0 && DEFAULT_TOOLS.length === 0) return tools
  return Object.fromEntries(
    Object.entries(tools).filter(
      ([key]) =>
        !INACTIVE_TOOLS.includes(key as AllToolNames) &&
        (includeDefault || !DEFAULT_TOOLS.includes(key as AllToolNames)),
    ),
  ) as T
}

// Re-export types from config
export type { MCPToolName, CodeToolName, AllToolNames }

// active tools (filtered)
const activeMCPTools = getActiveTools(TOOLS.mcp)
const activeCodeTools = getActiveTools(TOOLS.code)
const activeCodeToolsWithDefault = getActiveTools(TOOLS.code, true)

// exports for tool names
export const ACTIVE_MCP_TOOL_NAMES = Object.keys(activeMCPTools) as [MCPToolName, ...MCPToolName[]]
export const ACTIVE_CODE_TOOL_NAMES = Object.keys(activeCodeTools) as [CodeToolName, ...CodeToolName[]]
export const ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT = Object.keys(activeCodeToolsWithDefault) as [
  CodeToolName,
  ...CodeToolName[],
]

export const ALL_ACTIVE_TOOL_NAMES = [...Object.keys(activeMCPTools), ...Object.keys(activeCodeTools)] as const

// exports for tools with descriptions
export const ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION = activeMCPTools
export const ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION = activeCodeTools
export const ACTIVE_TOOLS_WITH_DESCRIPTION = {
  ...activeMCPTools,
  ...activeCodeTools,
} as Record<AllToolNames, string>

// export for external access
export { INACTIVE_TOOLS }
