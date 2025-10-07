import type { Edge } from "@xyflow/react"

import nodesConfig, { type AppNode } from "@/react-flow-visualization/components/nodes/nodes"
import {
  createWorkflowLayoutConfig,
  layoutGraph as runLayoutAlgorithm,
} from "@/react-flow-visualization/lib/layout-algorithm"

/**
 * Helper function to get node handles from node configuration
 */
function getNodeHandles(nodeType: string) {
  const config = nodesConfig[nodeType as keyof typeof nodesConfig]
  if (!config || !config.handles) {
    return []
  }
  return config.handles
}

/**
 * Applies automatic layout to workflow graph nodes
 *
 * This is a convenience wrapper around the layout algorithm that:
 * - Uses optimized defaults for workflow graphs
 * - Integrates with the node configuration system
 * - Returns only the positioned nodes (for backwards compatibility)
 *
 * @param nodes - Array of workflow nodes to layout
 * @param edges - Array of edges connecting the nodes
 * @returns Array of nodes with updated positions
 */
export async function layoutGraph(nodes: AppNode[], edges: Edge[]): Promise<AppNode[]> {
  try {
    const result = await runLayoutAlgorithm(nodes, edges, createWorkflowLayoutConfig(), getNodeHandles)

    // Log warnings if any
    if (result.warnings.length > 0) {
      console.warn("Layout warnings:", result.warnings)
    }

    // Log statistics
    if (process.env.NODE_ENV === "development") {
      console.log("Layout complete:", {
        processed: result.stats.nodesProcessed,
        positioned: result.stats.nodesPositioned,
        disconnected: result.stats.disconnectedNodes,
      })
    }

    return result.nodes
  } catch (error) {
    console.error("Layout failed:", error)
    // Return original nodes if layout fails
    return nodes
  }
}
