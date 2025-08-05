// FIXME: circular dependency - import.*from "@example/settings/tools"
import { getSettings } from "@utils/config/runtimeConfig"

// Temporary TOOLS definition to fix type issues
const TOOLS = {
  mcp: {} as Record<string, string>,
  code: {} as Record<string, string>,
} as const

const INACTIVE_TOOLS = getSettings().tools.inactive
const DEFAULT_TOOLS = getSettings().tools.defaultTools

export const getActiveTools = <T extends Record<string, any>>(
  tools: T,
  includeDefault: boolean = false
): T => {
  if (INACTIVE_TOOLS.size === 0 && DEFAULT_TOOLS.size === 0) return tools
  return Object.fromEntries(
    Object.entries(tools).filter(
      ([key]) =>
        !INACTIVE_TOOLS.has(key as AllToolNames) &&
        (includeDefault || !DEFAULT_TOOLS.has(key as AllToolNames))
    )
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

// Type-safe helper to get string keys only
function getStringKeys<T extends Record<string, any>>(obj: T): (keyof T & string)[] {
  return Object.keys(obj) as (keyof T & string)[]
}

// exports for tool names
export const ACTIVE_MCP_TOOL_NAMES = getStringKeys(activeMCPTools) as [
  MCPToolName,
  ...MCPToolName[],
]
export const ACTIVE_CODE_TOOL_NAMES = getStringKeys(activeCodeTools) as [
  CodeToolName,
  ...CodeToolName[],
]
export const ACTIVE_CODE_TOOL_NAMES_WITH_DEFAULT = getStringKeys(
  activeCodeToolsWithDefault
) as [CodeToolName, ...CodeToolName[]]

export const ALL_ACTIVE_TOOL_NAMES = [
  ...Object.keys(activeMCPTools),
  ...Object.keys(activeCodeTools),
] as const

// exports for tools with descriptions
export const ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION = activeMCPTools
export const ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION = activeCodeTools
export const ACTIVE_TOOLS_WITH_DESCRIPTION = {
  ...activeMCPTools,
  ...activeCodeTools,
} as Record<AllToolNames, string>

// export for external access
export { INACTIVE_TOOLS }
