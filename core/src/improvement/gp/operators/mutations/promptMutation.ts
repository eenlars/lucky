/**
 * Prompt mutation operations for evolving node system prompts.
 *
 * This module provides mutations that modify the system prompts of workflow
 * nodes using AI-driven variations. These mutations explore different
 * prompting strategies and styles to improve node performance.
 */

import { failureTracker } from "@core/improvement/gp/resources/tracker"
import { sendAI } from "@core/messages/api/sendAI/sendAI"
import { GENERALIZATION_LIMITS } from "@core/prompts/generalizationLimits"
import { WORKFLOW_GENERATION_RULES } from "@core/prompts/generationRules"
import { SharedWorkflowPrompts } from "@core/prompts/workflowAnalysisPrompts"
import { lgg } from "@core/utils/logging/Logger"
import type { WorkflowConfig, WorkflowNodeConfig } from "@core/workflow/schema/workflow.types"
import { getDefaultModels } from "@runtime/settings/models"
import type { Genome } from "../../Genome"
import type { IntensityLevel, MutationOperator } from "./mutation.types"

/**
 * Mutates node system prompts using AI-generated variations.
 *
 * Applies semantic mutations to node prompts while preserving core functionality.
 * The mutation intensity determines how dramatically the prompt changes, from
 * minimal tweaks to extreme rewrites. Can optionally apply specific prompt
 * patterns to guide the mutation process.
 *
 * @remarks
 * Prompt mutations are crucial for optimizing how nodes interpret and respond
 * to tasks. They enable evolution of communication styles, instruction clarity,
 * and task-specific optimizations.
 */
export class PromptMutation implements MutationOperator {
  /**
   * Executes prompt mutation on a randomly selected node.
   *
   * @param mutatedConfig - The workflow configuration to mutate (modified in-place)
   * @param parent - Parent genome providing context and goals
   * @param intensity - Mutation strength (0.0-1.0) determining variation level
   * @returns The cost in USD of the AI call for mutation
   *
   * @remarks
   * - Selects a random non-entry node for mutation
   * - Uses intensity to determine mutation severity (minimal/moderate/extreme)
   * - Has 70% chance to apply a specific prompt pattern
   * - Uses fast AI model for cost-effective mutations
   * - Tracks failures for evolution statistics
   */
  async execute(mutatedConfig: WorkflowConfig, parent: Genome, intensity: number): Promise<number> {
    const node = this.randomNonFrozenNode(mutatedConfig)
    if (!node) return 0

    // select a prompt pattern that might guide the mutation
    const chosenPromptPattern = SharedWorkflowPrompts.randomPromptPattern()
    // 70% chance to apply the pattern, 30% for free-form mutation
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

      ${GENERALIZATION_LIMITS}
      `

      const result = await sendAI({
        model: getDefaultModels().nano,
        messages: [{ role: "user", content: mutationPrompt }],
        mode: "text",
      })

      if (result.success) {
        node.systemPrompt = result.data.text
      } else {
        lgg.error("Prompt mutation failed - AI request unsuccessful:", result.error)
        failureTracker.trackMutationFailure()
      }

      return result.usdCost ?? 0
    } catch (error) {
      lgg.error("Prompt mutation failed with exception:", error)
      failureTracker.trackMutationFailure()
      return 0
    }
  }

  /**
   * Maps numerical intensity to semantic intensity levels.
   *
   * @param intensity - Mutation strength (0.0-1.0)
   * @returns Semantic intensity level for prompt variation
   *
   * @remarks
   * - 0.0-0.3: minimal changes (minor rewording, clarifications)
   * - 0.3-0.6: moderate changes (restructuring, style changes)
   * - 0.6-1.0: extreme changes (complete rewrites, paradigm shifts)
   */
  private getIntensityLevel(intensity: number): IntensityLevel {
    if (intensity > 0.6) return "extreme"
    if (intensity > 0.3) return "moderate"
    return "minimal"
  }

  /**
   * Selects a random node eligible for prompt mutation.
   *
   * @param workflow - The workflow configuration to search
   * @returns A randomly selected node, or null if none available
   *
   * @remarks
   * - Prefers non-entry nodes to preserve workflow stability
   * - Falls back to entry node for single-node workflows
   * - Entry nodes are considered "frozen" in multi-node workflows
   */
  private randomNonFrozenNode(workflow: WorkflowConfig): WorkflowNodeConfig | null {
    const nonFrozenNodes = workflow.nodes.filter((node: WorkflowNodeConfig) => node.nodeId !== workflow.entryNodeId)

    // if no non-entry nodes exist, allow mutation of entry node (for single-node workflows)
    if (nonFrozenNodes.length === 0 && workflow.nodes.length === 1) {
      return workflow.nodes[0]
    }

    return nonFrozenNodes.length > 0 ? nonFrozenNodes[Math.floor(Math.random() * nonFrozenNodes.length)] : null
  }
}
