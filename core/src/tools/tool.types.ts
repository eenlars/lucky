import { CONFIG } from "@core/core-config/compat"
import { TOOLS } from "@core/core-config/compat"

const INACTIVE_TOOLS = CONFIG.tools.inactive
const DEFAULT_TOOLS = CONFIG.tools.defaultTools

export const getActiveTools = <T extends Record<string, any>>(tools: T, includeDefault: boolean = false): T => {
  if (INACTIVE_TOOLS.size === 0 && DEFAULT_TOOLS.size === 0) return tools
  return Object.fromEntries(
    Object.entries(tools).filter(
      ([key]) =>
        !INACTIVE_TOOLS.has(key as AllToolNames) && (includeDefault || !DEFAULT_TOOLS.has(key as AllToolNames)),
    ),
  ) as T
}

// types
export type MCPToolName = keyof typeof TOOLS.mcp
export type CodeToolName = keyof typeof TOOLS.code
export type AllToolNames = MCPToolName | CodeToolName

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
