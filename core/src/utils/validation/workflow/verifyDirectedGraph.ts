import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { CONFIG } from "@runtime/settings/constants"
import type { VerificationErrors } from "./verify.types"

export function verifyNoCycles(config: WorkflowConfig): VerificationErrors {
  if (CONFIG.verification.allowCycles) {
    return []
  }

  const cycleExists = hasCycle(config.nodes)

  return cycleExists
    ? ["Workflow contains cycles - directed acyclic graph (DAG) required"]
    : []
}

/**
 * detects cycles in a directed graph using dfs with three-color approach
 * white (0): unvisited, gray (1): currently visiting, black (2): visited
 */
function hasCycle(
  nodes: Array<{ nodeId: string; handOffs: string[] }>
): boolean {
  const nodeMap = new Map(nodes.map((node) => [node.nodeId, node]))
  const colors = new Map<string, number>()

  // initialize all nodes as white (unvisited)
  for (const node of nodes) {
    colors.set(node.nodeId, 0)
  }

  // check each component for cycles
  for (const node of nodes) {
    if (colors.get(node.nodeId) === 0) {
      if (dfsHasCycle(node.nodeId, nodeMap, colors)) {
        return true
      }
    }
  }

  return false
}

function dfsHasCycle(
  nodeId: string,
  nodeMap: Map<string, { nodeId: string; handOffs: string[] }>,
  colors: Map<string, number>
): boolean {
  // mark current node as gray (visiting)
  colors.set(nodeId, 1)

  const node = nodeMap.get(nodeId)
  if (!node) return false

  // check all neighbors
  for (const handOff of node.handOffs) {
    // skip the special "end" handoff as it's not a cycle
    if (handOff === "end") continue

    const neighborColor = colors.get(handOff)

    // if neighbor is gray, we found a back edge (cycle)
    if (neighborColor === 1) {
      return true
    }

    // if neighbor is white, recursively check it
    if (neighborColor === 0 && dfsHasCycle(handOff, nodeMap, colors)) {
      return true
    }
  }

  // mark current node as black (visited)
  colors.set(nodeId, 2)
  return false
}
