/**
 * structure mutation operations
 */

import { failureTracker } from "@core/improvement/gp/resources/tracker"
import { SharedWorkflowPrompts } from "@core/prompts/workflowAnalysisPrompts"
import { lgg } from "@core/utils/logging/Logger"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { Workflow } from "@core/workflow/Workflow"
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
