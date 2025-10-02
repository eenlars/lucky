/**
 * Node mutation operations for genetic programming.
 *
 * This module provides node-level structural mutations that modify workflow
 * topology by adding or removing nodes. These operations are critical for
 * exploring different workflow architectures during evolution.
 */

import { failureTracker } from "@core/improvement/gp/resources/tracker"
import { lgg } from "@core/utils/logging/Logger"
import { Workflow } from "@core/workflow/Workflow"
import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import type { Genome } from "../../Genome"
import type { NodeMutationOperator } from "./mutation.types"

/**
 * Provides node addition and deletion operations for workflow mutation.
 *
 * These operations modify the workflow graph structure while preserving
 * important properties like memory and connectivity.
 */
export class NodeOperations {
  /**
   * Adds a new specialized node to enhance workflow capabilities.
   *
   * Uses AI-driven workflow formalization to intelligently insert a new node
   * that complements existing workflow functionality. The new node is positioned
   * to improve workflow performance based on the parent genome's context.
   *
   * @remarks
   * - Requires parent genome for context about workflow purpose
   * - Uses Workflow.formalizeWorkflow to generate appropriate node
   * - Automatically repairs workflow after node insertion
   * - Tracks failures for evolution statistics
   */
  static readonly addNode: NodeMutationOperator = {
    async execute(mutatedConfig: WorkflowConfig, parent?: Genome): Promise<void> {
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
          },
        )

        if (success && data) {
          mutatedConfig.nodes = data.nodes
          mutatedConfig.entryNodeId = data.entryNodeId
        } else {
          lgg.error("Add node mutation failed - formalizeWorkflow returned success=false")
          failureTracker.trackMutationFailure()
        }
      } catch (error) {
        lgg.error("Add node mutation failed with exception:", error)
        failureTracker.trackMutationFailure()
      }
    },
  }

  /**
   * Removes a leaf node from the workflow to simplify structure.
   *
   * Targets non-essential leaf nodes (nodes with no outgoing connections)
   * for deletion. Critically preserves any memory from the deleted node
   * by transferring it to remaining nodes or workflow-level memory.
   *
   * @remarks
   * - Only deletes leaf nodes to maintain workflow connectivity
   * - Never deletes the entry node
   * - Preserves memory by transferring to other nodes
   * - Falls back to workflow-level memory if no suitable nodes remain
   */
  static readonly deleteNode: NodeMutationOperator = {
    async execute(mutatedConfig: WorkflowConfig): Promise<void> {
      try {
        const victim = NodeOperations.randomNonFrozenLeaf(mutatedConfig)
        if (!victim) {
          lgg.warn("Delete node mutation skipped - no valid leaf nodes found")
          return
        }

        // memory protection: preserve memory from deleted node
        // this is critical for maintaining learned knowledge across mutations
        const victimMemory = victim.memory
        if (victimMemory && Object.keys(victimMemory).length > 0) {
          lgg.log(`Preserving memory from deleted node ${victim.nodeId}:`, victimMemory)

          // find a suitable node to transfer the memory to
          const remainingNodes = mutatedConfig.nodes.filter(n => n.nodeId !== victim.nodeId)
          if (remainingNodes.length > 0) {
            // transfer to the first remaining node
            // future enhancement: use similarity matching to find best target
            const targetNode = remainingNodes[0]
            targetNode.memory = { ...targetNode.memory, ...victimMemory }
            lgg.log(`Transferred deleted node memory to ${targetNode.nodeId}`)
          } else {
            // transfer to workflow-level memory as last resort
            // preserves knowledge even if all nodes are deleted
            mutatedConfig.memory = {
              ...mutatedConfig.memory,
              [`deleted_${victim.nodeId}`]: JSON.stringify(victimMemory),
            }
            lgg.log("Preserved deleted node memory at workflow level")
          }
        }

        mutatedConfig.nodes = mutatedConfig.nodes.filter((node: WorkflowNodeConfig) => node.nodeId !== victim.nodeId)
      } catch (error) {
        lgg.error("Delete node mutation failed:", error)
        failureTracker.trackMutationFailure()
      }
    },
  }

  /**
   * Selects a random leaf node eligible for deletion.
   *
   * @param workflow - The workflow configuration to search
   * @returns A leaf node that can be safely deleted, or null if none exist
   *
   * @remarks
   * Leaf nodes are nodes with no outgoing connections (handOffs).
   * The entry node is never selected for deletion to maintain workflow integrity.
   */
  private static randomNonFrozenLeaf(workflow: WorkflowConfig): WorkflowNodeConfig | null {
    const candidateNodes = workflow.nodes.filter(
      (node: WorkflowNodeConfig) =>
        node.nodeId !== workflow.entryNodeId && // don't delete entry node
        node.handOffs.length === 0, // only delete leaf nodes
    )
    return candidateNodes.length > 0 ? candidateNodes[Math.floor(Math.random() * candidateNodes.length)] : null
  }
}
