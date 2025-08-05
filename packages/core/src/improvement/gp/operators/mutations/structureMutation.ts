/**
 * structure mutation operations
 */

import { lgg } from "@utils/logging/Logger"
import { Workflow } from "@workflow/Workflow"
import { failureTracker } from "@gp/resources/tracker"
import { SharedWorkflowPrompts } from "@prompts/workflowAnalysisPrompts"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import type { NodeMutationOperator } from "./mutation.types"

export class StructureMutation implements NodeMutationOperator {
  async execute(mutatedConfig: WorkflowConfig): Promise<void> {
    const chosenPattern = SharedWorkflowPrompts.randomWorkflowStructure()
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
          : ""
      }`,
      {
        workflowConfig: mutatedConfig,
        verifyWorkflow: "normal",
        repairWorkflowAfterGeneration: true,
      }
    )

    if (success) {
      mutatedConfig.nodes = result.nodes
    } else {
      lgg.error("Structure mutation failed:", error)
      failureTracker.trackMutationFailure()
    }
  }
}
