import type { VerificationErrors } from "@utils/validation/workflow/verify.types"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import { getSettings } from "@utils/config/runtimeConfig"

/**
 * Verifies that a workflow follows hierarchical coordination constraints:
 * - Entry node is the orchestrator
 * - All nodes must be reachable from orchestrator (handled by connection verifier)
 * - Workers can hand off to other workers, orchestrator, or end
 * - No cycles allowed (handled by cycle verifier)
 */
export const verifyHierarchicalStructure = async (
  config: WorkflowConfig
): Promise<VerificationErrors> => {
  // Only validate if coordination type is hierarchical
  if (getSettings().coordinationType !== "hierarchical") return []

  const errors: string[] = []
  const orchestratorId = config.entryNodeId
  const orchestrator = config.nodes.find((n) => n.nodeId === orchestratorId)

  if (!orchestrator) {
    errors.push(`Orchestrator node '${orchestratorId}' not found in workflow`)
    return errors
  }

  // Build set of all valid node IDs for handoff validation
  const allNodeIds = new Set(config.nodes.map((n) => n.nodeId))

  // Validate each node's handoffs
  for (const node of config.nodes) {
    for (const handoff of node.handOffs) {
      if (handoff === "end" || handoff === orchestratorId) {
        // These are always valid
        continue
      }

      if (!allNodeIds.has(handoff)) {
        errors.push(
          `Node '${node.nodeId}' has invalid handoff to non-existent node: '${handoff}'.`
        )
      }
    }
  }

  // In hierarchical mode:
  // - Reachability is verified by connection verifier
  // - Cycles are prevented by cycle verifier
  // - We allow flexible worker chains as long as structure is valid

  return errors
}

/**
 * Helper function to determine if a node is the orchestrator
 * In hierarchical mode, the orchestrator is always the entry node
 */
export const isOrchestrator = (
  nodeId: string,
  config: WorkflowConfig
): boolean => {
  return (
    getSettings().coordinationType === "hierarchical" &&
    nodeId === config.entryNodeId
  )
}

/**
 * Helper function to get the implicit role of a node
 */
export const getNodeRole = (
  nodeId: string,
  config: WorkflowConfig
): "orchestrator" | "worker" | null => {
  if (getSettings().coordinationType !== "hierarchical") return null
  return nodeId === config.entryNodeId ? "orchestrator" : "worker"
}
