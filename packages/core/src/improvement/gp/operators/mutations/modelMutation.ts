/**
 * model mutation operations
 */

import { lgg } from "@utils/logging/Logger"
import { ACTIVE_MODEL_NAMES } from "@utils/spending/pricing"
import { failureTracker } from "@gp/resources/tracker"
import { getModelSettings } from "@utils/config/runtimeConfig"
import type {
  ModelName,
  WorkflowConfig,
  WorkflowNodeConfig,
} from "@workflow/schema/workflow.types"
import type { NodeMutationOperator } from "./mutation.types"

export class ModelMutation implements NodeMutationOperator {
  private static readonly MODEL_POOL = ACTIVE_MODEL_NAMES

  async execute(workflow: WorkflowConfig): Promise<void> {
    try {
      const node = this.randomNonFrozenNode(workflow)
      if (!node) {
        lgg.warn(
          "Model mutation skipped - no valid nodes found",
          JSON.stringify(workflow)
        )
        return
      }

      const modelsNotInPool: ModelName[] = ModelMutation.MODEL_POOL.filter(
        (model) => !getModelSettings().inactive.has(model)
      )

      if (modelsNotInPool.length === 0) {
        lgg.error("Model mutation failed - no valid models available")
        failureTracker.trackMutationFailure()
        return
      }

      // simple random model selection
      node.modelName =
        modelsNotInPool[Math.floor(Math.random() * modelsNotInPool.length)]
    } catch (error) {
      lgg.error("Model mutation failed:", error)
      failureTracker.trackMutationFailure()
    }
  }

  private randomNonFrozenNode(
    workflow: WorkflowConfig
  ): WorkflowNodeConfig | null {
    const nonFrozenNodes = workflow.nodes.filter(
      (node: WorkflowNodeConfig) => node.nodeId !== workflow.entryNodeId
    )

    // If no non-entry nodes exist, allow mutation of entry node (for single-node workflows)
    if (nonFrozenNodes.length === 0 && workflow.nodes.length === 1) {
      return workflow.nodes[0]
    }

    return nonFrozenNodes.length > 0
      ? nonFrozenNodes[Math.floor(Math.random() * nonFrozenNodes.length)]
      : null
  }
}
