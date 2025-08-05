/**
 * prompt mutation operations
 */

import { failureTracker } from "@core/improvement/gp/resources/tracker"
import { sendAI } from "@core/messages/api/sendAI"
import { WORKFLOW_GENERATION_RULES } from "@core/prompts/generationRules"
import { SharedWorkflowPrompts } from "@core/prompts/workflowAnalysisPrompts"
import { lgg } from "@core/utils/logging/Logger"
import type {
  WorkflowConfig,
  WorkflowNodeConfig,
} from "@core/workflow/schema/workflow.types"
import { MODELS } from "@runtime/settings/constants"
import type { Genome } from "../../Genome"
import type { IntensityLevel, MutationOperator } from "./mutation.types"

export class PromptMutation implements MutationOperator {
  async execute(
    mutatedConfig: WorkflowConfig,
    parent: Genome,
    intensity: number
  ): Promise<number> {
    const node = this.randomNonFrozenNode(mutatedConfig)
    if (!node) return 0

    const chosenPromptPattern = SharedWorkflowPrompts.randomPromptPattern()
    const usePromptPatternLikelihood = Math.random()

    try {
      const intensityLevel = this.getIntensityLevel(intensity)
      const mutationPrompt = `
      Create a(n) ${intensityLevel} variation of this node's system prompt: "${node.systemPrompt}". 
      Maintain core functionality but introduce ${intensityLevel} changes.
      ${WORKFLOW_GENERATION_RULES}

      ${
        usePromptPatternLikelihood > 0.7
          ? `you should implement this prompt pattern:
      ${chosenPromptPattern}`
          : ""
      }

      The goal of the workflow is : ${parent.getGoal()}
      `

      const result = await sendAI({
        model: MODELS.nano,
        messages: [{ role: "user", content: mutationPrompt }],
        mode: "text",
      })

      if (result.success) {
        node.systemPrompt = result.data.text
      } else {
        lgg.error(
          "Prompt mutation failed - AI request unsuccessful:",
          result.error
        )
        failureTracker.trackMutationFailure()
      }

      return result.usdCost ?? 0
    } catch (error) {
      lgg.error("Prompt mutation failed with exception:", error)
      failureTracker.trackMutationFailure()
      return 0
    }
  }

  private getIntensityLevel(intensity: number): IntensityLevel {
    if (intensity > 0.6) return "extreme"
    if (intensity > 0.3) return "moderate"
    return "minimal"
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
