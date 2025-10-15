/**
 * Code Toolkit Registration Framework
 *
 * This file provides types and utility functions for organizing code tools into logical toolkits.
 * Each toolkit contains related tools that work together to accomplish specific tasks.
 *
 * Actual toolkit registration happens in examples/definitions/registry-grouped.ts
 * This structure matches MCP registration for consistency.
 */

/**
 * Type definitions - matches MCP structure for consistency
 */
export type ToolkitToolDefinition = {
  toolName: string
  toolFunc: any // The actual tool function from defineTool()
  description: string
}

export type ToolkitDefinition = {
  toolkitName: string
  description: string
  tools: ToolkitToolDefinition[]
}

export type ToolkitRegistry = {
  toolkits: ToolkitDefinition[]
}

/**
 * Create a tool definition for use in toolkit registration
 */
export function createToolDefinition(toolName: string, toolFunc: any, description: string): ToolkitToolDefinition {
  return { toolName, toolFunc, description }
}

/**
 * Create a toolkit for organized registration
 */
export function createToolkit(
  toolkitName: string,
  description: string,
  tools: ToolkitToolDefinition[],
): ToolkitDefinition {
  return { toolkitName, description, tools }
}

/**
 * Get all tools flattened from all toolkits
 */
export function getAllTools(toolkitRegistry: ToolkitRegistry) {
  return toolkitRegistry.toolkits.flatMap(toolkit => toolkit.tools)
}

/**
 * Get tools by toolkit name
 */
export function getToolsByToolkit(toolkitRegistry: ToolkitRegistry, toolkitName: string) {
  const toolkit = toolkitRegistry.toolkits.find(t => t.toolkitName === toolkitName)
  return toolkit?.tools ?? []
}

/**
 * Get a specific tool by name
 */
export function getToolByName(toolkitRegistry: ToolkitRegistry, toolName: string) {
  for (const toolkit of toolkitRegistry.toolkits) {
    const tool = toolkit.tools.find(t => t.toolName === toolName)
    if (tool) return tool
  }
  return null
}
