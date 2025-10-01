/**
 * Structural mutation operations for workflow topology evolution.
 *
 * This module provides mutations that transform the overall structure
 * of workflows by applying common architectural patterns. These mutations
 * enable exploration of different workflow organizations during evolution.
 */

import { failureTracker } from "@core/improvement/gp/resources/tracker"
import { SharedWorkflowPrompts } from "@core/prompts/workflowAnalysisPrompts"
import { lgg } from "@core/utils/logging/Logger"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { Workflow } from "@core/workflow/Workflow"
import type { NodeMutationOperator } from "./mutation.types"

/**
 * Applies structural patterns to transform workflow topology.
 *
 * Uses predefined workflow patterns (e.g., pipeline, fan-out, hierarchical)
 * to reorganize the workflow structure. This mutation helps discover more
 * efficient or effective workflow architectures during evolution.
 *
 * @remarks
 * Structural mutations are high-impact changes that can significantly
 * alter workflow behavior by reorganizing node connections and flow patterns.
 */
export class StructureMutation implements NodeMutationOperator {
  /**
   * Executes structural mutation on the workflow configuration.
   *
   * @param mutatedConfig - The workflow configuration to mutate (modified in-place)
   *
   * @remarks
   * - Randomly selects a structural pattern from predefined templates
   * - Has 80% chance to strongly suggest the pattern, 20% to allow AI flexibility
   * - Uses Workflow.formalizeWorkflow to apply the structural transformation
   * - Automatically repairs the workflow after mutation
   * - Tracks failures for evolution statistics
   */
  async execute(mutatedConfig: WorkflowConfig): Promise<void> {
    // select a random workflow pattern to apply
    const chosenPattern = SharedWorkflowPrompts.randomWorkflowStructure()
    // determine how strongly to enforce the pattern (80% strong, 20% flexible)
    const usePatternLikelihood = Math.random()

    const {
      data: result,
      error,
      success,
    } = await Workflow.formalizeWorkflow(
      `mutate the structure of the workflow according to one of those patterns: ${chosenPattern}

      ${
        usePatternLikelihood > 0.8
          ? `you should implement this pattern:
      ${chosenPattern}`
          : "" // 20% chance to allow more creative interpretation
      }`,
      {
        workflowConfig: mutatedConfig,
        verifyWorkflow: "normal",
        repairWorkflowAfterGeneration: true,
      },
    )

    if (success) {
      mutatedConfig.nodes = result.nodes
    } else {
      lgg.error("Structure mutation failed:", error)
      failureTracker.trackMutationFailure()
    }
  }
}
