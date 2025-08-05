import { lgg } from "@logger"
import type { WorkflowNodeConfig } from "@workflow/schema/workflow.types"

/**
 * Splice a new node between predecessors and their current successors.
 *
 * Phase 1: Collect all successors from predecessors
 * Phase 2: Redirect predecessors → newNode → successors
 *
 * @param predecessors IDs from otherNodeHandoffsToAdd (1-3 nodes)
 * @param newNode The freshly created node (handOffs will be set by this function)
 * @param nodes The existing workflow nodes array
 */
export function spliceNode(
  predecessors: string[],
  newNode: WorkflowNodeConfig,
  nodes: WorkflowNodeConfig[]
): void {
  // Phase 1: Discover successors that will be displaced
  const successorSet = new Set<string>()

  predecessors.forEach((pId) => {
    const p = nodes.find((n) => n.nodeId === pId)
    if (!p) {
      lgg.error(`Unknown predecessor ${pId} - skipping`)
      return
    }

    // Capture current outbound targets
    p.handOffs.forEach((succ) => successorSet.add(succ))

    // Redirect predecessor → newNode
    p.handOffs = [newNode.nodeId]
  })

  // Phase 2: Wire newNode to the collected successors
  // Filter out self-references (shouldn't happen, but defensive)
  newNode.handOffs = [...successorSet].filter((id) => id !== newNode.nodeId)

  // If after filtering no successors remain, the node is terminal → point to "end"
  if (newNode.handOffs.length === 0) {
    newNode.handOffs.push("end")
  }
}
export function spliceNode2(
  predecessors: string[],
  newNode: WorkflowNodeConfig,
  nodes: WorkflowNodeConfig[]
): void {
  if (newNode) {
    lgg.log(`🔍 Processing new node: ${newNode.nodeId}`)

    // Clear any preset handOffs to ensure clean splice
    newNode.handOffs = []

    // use the specified handoffs instead of defaulting to entry node connection
    if (predecessors && predecessors.length > 0) {
      lgg.log(`🔍 Splicing node between: ${predecessors.join(", ")}`)
      spliceNode(predecessors, newNode, nodes)
    } else {
      // If no predecessors specified, this is likely the first node or an isolated node
      // In this case, it should point to "end"
      newNode.handOffs = ["end"]
    }

    // add the new node to the nodes array
    nodes.push(newNode)
  }
}
