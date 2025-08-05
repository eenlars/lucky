import { lgg } from "@core/utils/logging/Logger"
import type { FitnessOfWorkflow } from "@core/workflow/actions/analyze/calculate-fitness/fitness.types"
import type {
  WorkflowConfig,
  WorkflowNodeConfig,
} from "@core/workflow/schema/workflow.types"
import type { Workflow } from "@core/workflow/Workflow"
import { CONFIG } from "@runtime/settings/constants"

/**
 * Parameters for node self-improvement
 */
export interface NodeSelfImprovementParams {
  workflowInvocationId: string
  fitness: FitnessOfWorkflow
  feedback: string
  setup: WorkflowConfig
  goal: string
}

/**
 * Step 1: Improves individual nodes based on their performance
 */
export async function improveNodesSelfImprovement(
  workflow: Workflow,
  params: NodeSelfImprovementParams
): Promise<WorkflowNodeConfig[]> {
  if (!CONFIG.improvement.flags.selfImproveNodes) {
    return []
  }

  const { workflowInvocationId, fitness, setup, goal } = params
  const improvedNodes: WorkflowNodeConfig[] = []

  lgg.log("🔄 Starting node self-improvement...")

  for (const nodeId of workflow.getNodeIds()) {
    const node = workflow.getNode(nodeId)
    const improvedNode = await node.selfImprove({
      workflowInvocationId,
      fitness,
      setup,
      goal,
    })
    improvedNodes.push(improvedNode)
  }

  lgg.log(`✅ Improved ${improvedNodes.length} nodes`)
  return improvedNodes
}

/**
 * Gets existing node configurations without improvement
 */
export function getExistingNodeConfigs(
  workflow: Workflow
): WorkflowNodeConfig[] {
  const nodes: WorkflowNodeConfig[] = []
  for (const nodeId of workflow.getNodeIds()) {
    nodes.push(workflow.getNode(nodeId).toConfig())
  }
  return nodes
}
