import type { WorkflowNodeData } from "@/react-flow-visualization/components/nodes"

/**
 * Get all tools for a node (MCP + Code tools combined)
 */
export function getAllTools(nodeData: WorkflowNodeData): string[] {
  return [...(nodeData.mcpTools || []), ...(nodeData.codeTools || [])]
}

/**
 * Get tool count for display
 */
export function getToolCount(nodeData: WorkflowNodeData): number {
  return getAllTools(nodeData).length
}
