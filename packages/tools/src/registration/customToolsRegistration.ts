/**
 * Code Toolkit Registration Framework
 *
 * This file provides types and utility functions for organizing code tools into logical toolkits.
 * Each toolkit contains related tools that work together to accomplish specific tasks.
 *
 * Actual toolkit registration happens in examples/definitions/registry.ts
 * This structure matches MCP registration for consistency.
 */

// Structural type of a defineTool() output used by the registry
import type { RS } from "../factory/types"

export type ToolkitTool = {
  name: string
  description?: string
  // todo-typesafety: replace 'any' with proper parameter and return types - violates CLAUDE.md "we hate any"
  parameters: any
  execute: (params: any, externalContext?: any) => Promise<RS<any>> | RS<any>
}

export type CustomToolDefinition = {
  toolName: string
  toolFunc: ToolkitTool
  description: string
}

export type MCPServerToolDefinition = {
  toolName: string
  description: string
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
}

export type ToolkitType = "code" | "mcp" | "all"

export type ToolkitDefinition<T extends ToolkitType = "code"> = T extends "code"
  ? {
      type: "code"
      toolkitName: string
      description: string
      tools: CustomToolDefinition[]
    }
  : T extends "mcp"
    ? {
        type: "mcp"
        toolkitName: string
        description: string
        tools: MCPServerToolDefinition[]
      }
    : {
        type: "all"
        toolkitName: string
        description: string
        tools: (CustomToolDefinition | MCPServerToolDefinition)[]
      }

export type ToolkitRegistry<T extends ToolkitType = "code"> = {
  toolkits: ToolkitDefinition<T>[]
}

/**
 * Create a tool definition for use in toolkit registration
 */
export function createCustomToolDefinition(
  toolName: string,
  toolFunc: CustomToolDefinition["toolFunc"],
  description: string,
): CustomToolDefinition {
  return { toolName, toolFunc, description }
}

/**
 * Create a toolkit for organized registration
 */
export function createToolkit(
  toolkitName: string,
  description: string,
  tools: CustomToolDefinition[],
): ToolkitDefinition {
  return { type: "code", toolkitName, description, tools }
}

/**
 * Get all tools flattened from all toolkits
 */
export function getAllCustomToolsByToolkit(toolkitRegistry: ToolkitRegistry): CustomToolDefinition[] {
  return toolkitRegistry.toolkits.flatMap((toolkit: ToolkitDefinition) => {
    if (toolkit.type === "code") {
      return toolkit.tools
    }
    return []
  })
}

/**
 * Get tools by toolkit name
 */
export function getCustomToolsByToolkit(toolkitRegistry: ToolkitRegistry, toolkitName: string): CustomToolDefinition[] {
  const toolkit = toolkitRegistry.toolkits.find(
    (t: ToolkitDefinition) => t.type === "code" && t.toolkitName === toolkitName,
  )
  return (toolkit?.type === "code" ? toolkit.tools : []) ?? []
}

/**
 * Get a specific tool by name
 */
export function getCustomToolByName(toolkitRegistry: ToolkitRegistry, toolName: string): CustomToolDefinition | null {
  for (const toolkit of toolkitRegistry.toolkits) {
    if (toolkit.type === "code") {
      const tool = toolkit.tools.find((t: CustomToolDefinition) => t.toolName === toolName)
      if (tool) return tool
    }
  }
  return null
}
