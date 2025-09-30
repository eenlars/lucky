import {
  ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_TOOLS_WITH_DESCRIPTION,
  ALL_ACTIVE_TOOL_NAMES,
  type AllToolNames,
} from "@core/tools/tool.types"

/**
 * creates formatted tool descriptions for a subset of tools
 * normalizes input, filters for valid active tools, and provides descriptions
 * @param toolNames - array of tool name strings (may contain invalid/inactive tools)
 * @returns formatted string with tool descriptions, empty string if no valid tools
 */
export function explainSubsetOfTools(toolNames: string[]): string {
  if (!Array.isArray(toolNames) || toolNames.length === 0) {
    return ""
  }

  // normalize and validate tool names
  const validTools = normalizeAndFilterTools(toolNames)

  if (validTools.length === 0) {
    return ""
  }

  // format each valid tool with description
  return validTools
    .map(toolName => {
      const description = ACTIVE_TOOLS_WITH_DESCRIPTION[toolName]
      return `<tool:${toolName}>
    ${toolName}: ${description}
    </tool:${toolName}>`
    })
    .join("")
}

/**
 * normalizes tool names and filters for valid active tools
 * @param toolNames - raw tool name strings
 * @returns array of valid tool names (typed as AllToolNames)
 */
function normalizeAndFilterTools(toolNames: string[]): AllToolNames[] {
  const activeToolsSet = new Set(ALL_ACTIVE_TOOL_NAMES)

  return toolNames
    .map(name => name?.toString().trim()) // normalize: convert to string and trim
    .filter((name): name is string => Boolean(name)) // remove empty/null/undefined
    .filter((name): name is AllToolNames => activeToolsSet.has(name as AllToolNames))
    .filter((name, index, arr) => arr.indexOf(name) === index) // remove duplicates
}

/* helper to create description strings for prompts
 * example output:
 * mcpTools:[id:browserUse,description:Use a browser to browse the web]
 * codeTools:[id:csvInfo,description:Reads and analyzes CSV files to
 *   provide information about their structure and content]
 */
export const toolsExplanations = (type: "mcp" | "code" | "all" = "all") => {
  if (type === "all") {
    const mcpToolsStr = Object.entries(ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION)
      .map(([id, desc]) => `id:${id},description:${desc}`)
      .join(", ")

    const codeToolsStr = Object.entries(ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION)
      .map(([id, desc]) => `id:${id},description:${desc}`)
      .join(", ")

    return `mcpTools:[${mcpToolsStr}], codeTools:[${codeToolsStr}]`
  }

  const tools = type === "mcp" ? ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION : ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION

  return Object.entries(tools)
    .map(([id, desc]) => `id:${id},description:${desc}`)
    .join("; ")
}
