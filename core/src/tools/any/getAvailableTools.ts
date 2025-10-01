import type { CodeToolName, MCPToolName } from "@lucky/tools"
import {
  ACTIVE_CODE_TOOL_NAMES,
  ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION,
  ACTIVE_MCP_TOOL_NAMES,
  ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION,
} from "@lucky/tools"
import type { Workflow } from "@core/workflow/Workflow"

/**
 * Get all code tools that are currently used in the workflow
 */
export function getUsedCodeTools(workflow: Workflow): CodeToolName[] {
  const usedTools = new Set<CodeToolName>()

  // Iterate through all nodes in the workflow
  for (const node of workflow.nodes) {
    // Add all code tools from this node to our set
    for (const tool of Object.keys(node.getCodeTools())) {
      // Type guard to ensure the tool is a valid CodeToolName
      if (ACTIVE_CODE_TOOL_NAMES.includes(tool as CodeToolName)) {
        usedTools.add(tool as CodeToolName)
      }
    }
  }

  return Array.from(usedTools).sort()
}

/**
 * Get all MCP tools that are currently used in the workflow
 */
export function getUsedMCPTools(workflow: Workflow): MCPToolName[] {
  const usedTools = new Set<MCPToolName>()

  // Iterate through all nodes in the workflow
  for (const node of workflow.nodes) {
    // Add all MCP tools from this node to our set
    for (const tool of Object.keys(node.getMCPTools())) {
      // Type guard to ensure the tool is a valid MCPToolName
      if (ACTIVE_MCP_TOOL_NAMES.includes(tool as MCPToolName)) {
        usedTools.add(tool as MCPToolName)
      }
    }
  }

  return Array.from(usedTools).sort()
}

/**
 * Get all code tools that are available but not currently used in the workflow
 */
export function getAvailableCodeTools(workflow: Workflow): CodeToolName[] {
  const usedTools = new Set(getUsedCodeTools(workflow))
  return ACTIVE_CODE_TOOL_NAMES.filter(tool => !usedTools.has(tool))
}

/**
 * Get all MCP tools that are available but not currently used in the workflow
 */
export function getAvailableMCPTools(workflow: Workflow): MCPToolName[] {
  const usedTools = new Set(getUsedMCPTools(workflow))
  return ACTIVE_MCP_TOOL_NAMES.filter(tool => !usedTools.has(tool))
}

/**
 * Check if a specific code tool is currently used in the workflow
 */
export function isCodeToolInUse(workflow: Workflow, toolName: CodeToolName): boolean {
  return getUsedCodeTools(workflow).includes(toolName)
}

/**
 * Check if a specific MCP tool is currently used in the workflow
 */
export function isMCPToolInUse(workflow: Workflow, toolName: MCPToolName): boolean {
  return getUsedMCPTools(workflow).includes(toolName)
}

/**
 * Check if a specific code tool is available (not currently used) in the workflow
 */
export function isCodeToolAvailable(workflow: Workflow, toolName: CodeToolName): boolean {
  return !isCodeToolInUse(workflow, toolName)
}

/**
 * Check if a specific MCP tool is available (not currently used) in the workflow
 */
export function isMCPToolAvailable(workflow: Workflow, toolName: MCPToolName): boolean {
  return !isMCPToolInUse(workflow, toolName)
}

/**
 * Helper to build tool description records
 */
function buildCodeToolDescriptions(tools: CodeToolName[]): Record<CodeToolName, string> {
  const result: Record<string, string> = {}
  for (const tool of tools) {
    result[tool] = ACTIVE_CODE_TOOL_NAMES_WITH_DESCRIPTION[tool]
  }
  return result as Record<CodeToolName, string>
}

/**
 * Helper to build MCP tool description records
 */
function buildMCPToolDescriptions(tools: MCPToolName[]): Record<MCPToolName, string> {
  const result: Record<string, string> = {}
  for (const tool of tools) {
    result[tool] = ACTIVE_MCP_TOOL_NAMES_WITH_DESCRIPTION[tool]
  }
  return result as Record<MCPToolName, string>
}

/**
 * Get a summary of used code tools with their descriptions
 */
export function getUsedCodeToolsWithDescriptions(workflow: Workflow): Record<CodeToolName, string> {
  return buildCodeToolDescriptions(getUsedCodeTools(workflow))
}

/**
 * Get a summary of used MCP tools with their descriptions
 */
export function getUsedMCPToolsWithDescriptions(workflow: Workflow): Record<MCPToolName, string> {
  return buildMCPToolDescriptions(getUsedMCPTools(workflow))
}

/**
 * Get a summary of available code tools with their descriptions
 */
export function getAvailableCodeToolsWithDescriptions(workflow: Workflow): Record<CodeToolName, string> {
  return buildCodeToolDescriptions(getAvailableCodeTools(workflow))
}

/**
 * Get a summary of available MCP tools with their descriptions
 */
export function getAvailableMCPToolsWithDescriptions(workflow: Workflow): Record<MCPToolName, string> {
  return buildMCPToolDescriptions(getAvailableMCPTools(workflow))
}
