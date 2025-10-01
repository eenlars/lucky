/**
 * Code Tool Registration Framework
 *
 * This file provides types and utility functions for organizing code tools into logical groups.
 * Each group contains related tools that work together to accomplish specific tasks.
 *
 * Actual tool registration happens in examples/definitions/registry.ts
 * This structure matches MCP registration for consistency.
 */

/**
 * Type definitions - matches MCP structure for consistency
 */
export type CodeToolDefinition = {
  toolName: string
  toolFunc: any // The actual tool function from defineTool()
  description: string
}

export type CodeToolGroup = {
  groupName: string
  description: string
  tools: CodeToolDefinition[]
}

export type CodeToolGroups = {
  groups: CodeToolGroup[]
}

/**
 * Create a tool definition for use in grouped registration
 */
export function createToolDefinition(toolName: string, toolFunc: any, description: string): CodeToolDefinition {
  return { toolName, toolFunc, description }
}

/**
 * Create a tool group for organized registration
 */
export function createToolGroup(groupName: string, description: string, tools: CodeToolDefinition[]): CodeToolGroup {
  return { groupName, description, tools }
}

/**
 * Get all tools flattened from all groups
 */
export function getAllTools(toolGroups: CodeToolGroups) {
  return toolGroups.groups.flatMap(group => group.tools)
}

/**
 * Get tools by group name
 */
export function getToolsByGroup(toolGroups: CodeToolGroups, groupName: string) {
  const group = toolGroups.groups.find(g => g.groupName === groupName)
  return group?.tools ?? []
}

/**
 * Get a specific tool by name
 */
export function getToolByName(toolGroups: CodeToolGroups, toolName: string) {
  for (const group of toolGroups.groups) {
    const tool = group.tools.find(t => t.toolName === toolName)
    if (tool) return tool
  }
  return null
}
