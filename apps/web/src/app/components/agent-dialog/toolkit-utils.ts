/**
 * Toolkit utilities for managing toolkit and tool state in the config panel
 * Works with flat tool arrays but organizes them by toolkit in the UI
 */

import { TOOL_TOOLKITS } from "@lucky/examples/definitions/registry-grouped"
import type { CodeToolName, MCPToolName } from "@lucky/tools"
import { mcpToolkits } from "@lucky/tools/registration/mcpToolsRegistration"

export type ToolType = "mcp" | "code"

/**
 * Get all toolkit names for a given type
 */
export function getAllToolkitNames(type: ToolType): string[] {
  if (type === "mcp") {
    return mcpToolkits.toolkits.map(t => t.toolkitName)
  }
  return TOOL_TOOLKITS.toolkits.map(t => t.toolkitName)
}

/**
 * Get all tools in a specific toolkit
 */
export function getToolsInToolkit(toolkitName: string, type: ToolType): string[] {
  if (type === "mcp") {
    const toolkit = mcpToolkits.toolkits.find(t => t.toolkitName === toolkitName)
  return toolkit?.tools?.map(tool => tool.toolName) ?? []
  }
  const toolkit = TOOL_TOOLKITS.toolkits.find(t => t.toolkitName === toolkitName)
  return toolkit?.tools.map(tool => tool.toolName) ?? []
}

/**
 * Get toolkit description
 */
export function getToolkitDescription(toolkitName: string, type: ToolType): string {
  if (type === "mcp") {
    const toolkit = mcpToolkits.toolkits.find(t => t.toolkitName === toolkitName)
    return toolkit?.description ?? ""
  }
  const toolkit = TOOL_TOOLKITS.toolkits.find(t => t.toolkitName === toolkitName)
  return toolkit?.description ?? ""
}

/**
 * Get tool description
 */
export function getToolDescription(toolName: string, type: ToolType): string {
  if (type === "mcp") {
    for (const toolkit of mcpToolkits.toolkits) {
      const tool = toolkit.tools.find(t => t.toolName === toolName)
      if (tool) return tool.description ?? ""
    }
  } else {
    for (const toolkit of TOOL_TOOLKITS.toolkits) {
      const tool = toolkit.tools.find(t => t.toolName === toolName)
      if (tool) return tool.description ?? ""
    }
  }
  return ""
}

/**
 * Get tools in a toolkit as a flat array
 */
export function getToolsInToolkitFlat(toolkitName: string, type: ToolType): (MCPToolName | CodeToolName)[] {
  const tools = getToolsInToolkit(toolkitName, type)
  return tools as (MCPToolName | CodeToolName)[]
}

/**
 * Toggle an entire toolkit on/off for MCP tools
 */
export function toggleMCPToolkit(currentTools: MCPToolName[], toolkitName: string): MCPToolName[] {
  const toolkitTools = getToolsInToolkit(toolkitName, "mcp") as MCPToolName[]

  const allToolkitToolsSelected = toolkitTools.every(tool => currentTools.includes(tool))

  if (allToolkitToolsSelected) {
    return currentTools.filter(tool => !toolkitTools.includes(tool))
  }

  const newTools = [...currentTools]
  toolkitTools.forEach(tool => {
    if (!newTools.includes(tool)) {
      newTools.push(tool)
    }
  })
  return newTools
}

/**
 * Toggle an entire toolkit on/off for code tools
 */
export function toggleCodeToolkit(currentTools: CodeToolName[], toolkitName: string): CodeToolName[] {
  const toolkitTools = getToolsInToolkit(toolkitName, "code") as CodeToolName[]

  const allToolkitToolsSelected = toolkitTools.every(tool => currentTools.includes(tool))

  if (allToolkitToolsSelected) {
    return currentTools.filter(tool => !toolkitTools.includes(tool))
  }

  const newTools = [...currentTools]
  toolkitTools.forEach(tool => {
    if (!newTools.includes(tool)) {
      newTools.push(tool)
    }
  })
  return newTools
}

/**
 * Toggle an individual MCP tool
 */
export function toggleMCPTool(currentTools: MCPToolName[], toolName: MCPToolName): MCPToolName[] {
  if (currentTools.includes(toolName)) {
    return currentTools.filter(t => t !== toolName)
  }
  return [...currentTools, toolName]
}

/**
 * Toggle an individual code tool
 */
export function toggleCodeTool(currentTools: CodeToolName[], toolName: CodeToolName): CodeToolName[] {
  if (currentTools.includes(toolName)) {
    return currentTools.filter(t => t !== toolName)
  }
  return [...currentTools, toolName]
}

/**
 * Get all MCP tools
 */
export function getAllMCPTools(enable: boolean): MCPToolName[] {
  if (!enable) return []
  return getAllToolkitNames("mcp").flatMap(name => getToolsInToolkit(name, "mcp")) as MCPToolName[]
}

/**
 * Get all code tools
 */
export function getAllCodeTools(enable: boolean): CodeToolName[] {
  if (!enable) return []
  return getAllToolkitNames("code").flatMap(name => getToolsInToolkit(name, "code")) as CodeToolName[]
}

/**
 * Check if all tools in a toolkit are selected
 */
export function areAllToolkitToolsSelected(
  currentTools: (MCPToolName | CodeToolName)[],
  toolkitName: string,
  type: ToolType,
): boolean {
  const toolkitTools = getToolsInToolkitFlat(toolkitName, type)
  return toolkitTools.every(tool => currentTools.includes(tool))
}

/**
 * Get count of tools selected in a toolkit
 */
export function countToolkitToolsSelected(
  currentTools: (MCPToolName | CodeToolName)[],
  toolkitName: string,
  type: ToolType,
): number {
  const toolkitTools = getToolsInToolkitFlat(toolkitName, type)
  return toolkitTools.filter(tool => currentTools.includes(tool)).length
}

/**
 * Check if all tools are selected
 */
export function areAllToolsEnabled(currentTools: (MCPToolName | CodeToolName)[], type: ToolType): boolean {
  const totalTools = countTotalTools(type)
  return currentTools.length === totalTools && totalTools > 0
}

/**
 * Get count of total available tools
 */
export function countTotalTools(type: ToolType): number {
  let total = 0
  getAllToolkitNames(type).forEach(toolkitName => {
    total += getToolsInToolkit(toolkitName, type).length
  })
  return total
}
