/**
 * node addition and deletion operations
 */

import { lgg } from "@/core/utils/logging/Logger"
import { Workflow } from "@/core/workflow/Workflow"
import { failureTracker } from "@gp/resources/tracker"
import type {
  WorkflowConfig,
  WorkflowNodeConfig,
} from "@workflow/schema/workflow.types"
import type { Genome } from "../../Genome"
import type { NodeMutationOperator } from "./mutation.types"

export class NodeOperations {
  static readonly addNode: NodeMutationOperator = {
    async execute(
      mutatedConfig: WorkflowConfig,
      parent?: Genome
    ): Promise<void> {
      if (!parent) {
        lgg.error("Add node mutation requires parent genome")
        return
      }

      try {
        const { success, data } = await Workflow.formalizeWorkflow(
          `Add a new specialized node to enhance this workflow with additional capabilities. 
          this is the parent workflow: ${parent.toString({ easyModelNames: true })}
          the goal is to fix bugs given an input.        
          `,
          {
            workflowConfig: mutatedConfig,
            verifyWorkflow: "normal",
            repairWorkflowAfterGeneration: true,
          }
        )

        if (success && data) {
          mutatedConfig.nodes = data.nodes
          mutatedConfig.entryNodeId = data.entryNodeId
        } else {
          lgg.error(
            "Add node mutation failed - formalizeWorkflow returned success=false"
          )
          failureTracker.trackMutationFailure()
        }
      } catch (error) {
        lgg.error("Add node mutation failed with exception:", error)
        failureTracker.trackMutationFailure()
      }
    },
  }

  static readonly deleteNode: NodeMutationOperator = {
    async execute(mutatedConfig: WorkflowConfig): Promise<void> {
      try {
        const victim = NodeOperations.randomNonFrozenLeaf(mutatedConfig)
        if (!victim) {
          lgg.warn("Delete node mutation skipped - no valid leaf nodes found")
          return
        }

        // MEMORY PROTECTION: preserve memory from deleted node
        const victimMemory = victim.memory
        if (victimMemory && Object.keys(victimMemory).length > 0) {
          lgg.log(
            `Preserving memory from deleted node ${victim.nodeId}:`,
            victimMemory
          )

          // find a suitable node to transfer the memory to
          const remainingNodes = mutatedConfig.nodes.filter(
            (n) => n.nodeId !== victim.nodeId
          )
          if (remainingNodes.length > 0) {
            // transfer to the first remaining node (could be enhanced with similarity matching)
            const targetNode = remainingNodes[0]
            targetNode.memory = { ...targetNode.memory, ...victimMemory }
            lgg.log(`Transferred deleted node memory to ${targetNode.nodeId}`)
          } else {
            // transfer to workflow-level memory as last resort
            mutatedConfig.memory = {
              ...mutatedConfig.memory,
              [`deleted_${victim.nodeId}`]: JSON.stringify(victimMemory),
            }
            lgg.log(`Preserved deleted node memory at workflow level`)
          }
        }

        mutatedConfig.nodes = mutatedConfig.nodes.filter(
          (node: WorkflowNodeConfig) => node.nodeId !== victim.nodeId
        )
      } catch (error) {
        lgg.error("Delete node mutation failed:", error)
        failureTracker.trackMutationFailure()
      }
    },
  }

  private static randomNonFrozenLeaf(
    workflow: WorkflowConfig
  ): WorkflowNodeConfig | null {
    const candidateNodes = workflow.nodes.filter(
      (node: WorkflowNodeConfig) =>
        node.nodeId !== workflow.entryNodeId && // Don't delete entry node
        node.handOffs.length === 0 // Only delete leaf nodes
    )
    return candidateNodes.length > 0
      ? candidateNodes[Math.floor(Math.random() * candidateNodes.length)]
      : null
  }
}
