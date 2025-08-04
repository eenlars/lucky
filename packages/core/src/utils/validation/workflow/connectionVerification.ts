import type { VerificationErrors } from "@/utils/validation/workflow/verify.types"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"

// we have one start node, and in some way, every node needs to be connected to the start node
export const everyNodeIsConnectedToStartNode = async (
  config: WorkflowConfig
): Promise<VerificationErrors> => {
  const visited = new Set<string>()
  const queue: string[] = [config.entryNodeId]

  // BFS traversal from start node
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    if (visited.has(nodeId)) continue
    visited.add(nodeId)

    const node = config.nodes.find((n) => n.nodeId === nodeId)
    if (!node) continue

    node.handOffs
      .filter((handOff) => handOff !== "end")
      .forEach((handOff) => queue.push(handOff))
  }

  // Find unreachable nodes
  const unreachableNodes = config.nodes
    .filter((node) => !visited.has(node.nodeId))
    .map(
      (node) =>
        `Node '${node.nodeId}' is not reachable from start node '${config.entryNodeId}'`
    )

  return unreachableNodes
}

// ensure the start node is connected to an end node in some way
// verify start node can reach an end node
export const startNodeIsConnectedToEndNode = async (
  config: WorkflowConfig
): Promise<VerificationErrors> => {
  const visited = new Set<string>()
  const queue: string[] = [config.entryNodeId]

  // BFS to find path to 'end'
  while (queue.length > 0) {
    const nodeId = queue.shift()!
    if (visited.has(nodeId)) continue
    visited.add(nodeId)

    const node = config.nodes.find((n) => n.nodeId === nodeId)
    if (!node) continue

    if (node.handOffs.includes("end")) {
      return [] // Found path to end
    }

    node.handOffs
      .filter((handOff) => handOff !== "end")
      .forEach((handOff) => queue.push(handOff))
  }

  return [
    `No path exists from start node '${config.entryNodeId}' to any end node. make sure the last (reachable) node has a handoff to 'end'`,
  ]
}

// verify that all handoffs point to nodes that exist in the workflow
export const allHandoffNodesExist = async (
  config: WorkflowConfig
): Promise<VerificationErrors> => {
  const errors: string[] = []
  const nodeIds = new Set(config.nodes.map((node) => node.nodeId))

  for (const node of config.nodes) {
    for (const handOff of node.handOffs) {
      // skip the special "end" handoff
      if (handOff !== "end" && !nodeIds.has(handOff)) {
        errors.push(
          `Node '${node.nodeId}' has a handoff to non-existent node '${handOff}'`
        )
      }
    }
  }

  return errors
}
