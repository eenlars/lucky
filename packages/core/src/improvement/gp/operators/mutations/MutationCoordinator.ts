/**
 * MutationCoordinator - Central orchestrator for genetic programming mutations.
 *
 * Handles various mutation strategies including:
 * - Model mutations (changing AI models)
 * - Prompt mutations (modifying system prompts)
 * - Tool mutations (adding/removing tools)
 * - Structure mutations (changing workflow topology)
 * - Node operations (adding/deleting nodes)
 * - Iterative mutations (using behavioral evolution)
 *
 * Mutations are selected based on weighted probability distribution
 * and preserve memory from parent genomes.
 */

import { CONFIG } from "@core/core-config/compat"
import { improveWorkflowUnified } from "@core/improvement/behavioral/judge/improveWorkflow"
import { createDummyGenome } from "@core/improvement/gp/resources/debug/dummyGenome"
import { failureTracker } from "@core/improvement/gp/resources/tracker"
import type { FlowEvolutionMode } from "@core/types"
import { truncater } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { validateAndRepairWorkflow } from "@core/utils/validation/validateWorkflow"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { R, type RS } from "@lucky/shared"
import type { Genome } from "../../Genome"
import { workflowConfigToGenome } from "../../resources/wrappers"
import { ModelMutation } from "./modelMutation"
import { MUTATION_WEIGHTS, type MutationOptions, type MutationType, getEvolutionMutations } from "./mutation.types"
import { NodeOperations } from "./nodeOperations"
import { PromptMutation } from "./promptMutation"
import { StructureMutation } from "./structureMutation"
import { ToolMutation } from "./toolMutation"

export class MutationCoordinator {
  private static readonly modelMutation = new ModelMutation()
  private static readonly promptMutation = new PromptMutation()
  private static readonly toolMutation = new ToolMutation()
  private static readonly structureMutation = new StructureMutation()

  /**
   * Mutates a workflow genome using various mutation strategies.
   *
   * @param options - Mutation configuration including:
   *   - parent: The genome to mutate
   *   - intensity: Mutation strength (0.0-1.0), affects probability of additional changes
   *   - evolutionMode: The evolution mode determining available mutation types
   *
   * @returns Result containing the mutated genome or error with associated costs
   *
   * @remarks
   * - Selects mutation type based on weighted probability
   * - Preserves memory from parent genome
   * - Validates and repairs mutated workflow
   * - Tracks mutation failures for evolution statistics
   */
  static async mutateWorkflowGenome(options: MutationOptions): Promise<RS<Genome>> {
    const { parent, intensity = 0.5, evolutionMode } = options

    if (CONFIG.evolution.GP.verbose) {
      return {
        success: true,
        data: createDummyGenome([parent.getWorkflowVersionId()], parent.getEvolutionContext()),
        usdCost: 0,
      }
    }

    try {
      let mutatedConfig = structuredClone(parent.getWorkflowConfig())
      let totalMutationCost = 0

      // weighted random selection of mutation type
      const selectedMutation = MutationCoordinator.selectMutationType(evolutionMode)

      // execute the selected mutation
      totalMutationCost += await MutationCoordinator.executeMutation(selectedMutation, mutatedConfig, parent, intensity)

      // preserve memory from parent - ensures knowledge transfer across generations
      const { MemoryPreservation } = await import("../memoryPreservation")
      MemoryPreservation.preserveMutationMemory(mutatedConfig, parent)

      // enforce memory preservation - throw error if any parent memories were lost
      // this is critical for maintaining learned knowledge across evolution
      MemoryPreservation.enforceMemoryPreservation(mutatedConfig, [parent], "mutation")

      // apply additional tweaks based on intensity level
      // high intensity mutations (>0.6) have a chance to also mutate models
      if (intensity > 0.6 && Math.random() < intensity) {
        await MutationCoordinator.modelMutation.execute(mutatedConfig)
      }

      const { finalConfig } = await validateAndRepairWorkflow(mutatedConfig, {
        maxRetries: 2,
        onFail: "returnNull",
      })
      if (finalConfig === null) {
        lgg.error("Mutation repair failed")
        failureTracker.trackMutationFailure()
        return R.error("Mutation repair failed", 0)
      }
      mutatedConfig = finalConfig

      const {
        data: mutatedGenome,
        usdCost: mutationCost,
        error: mutationError,
      } = await workflowConfigToGenome({
        workflowConfig: mutatedConfig,
        parentWorkflowVersionIds: [parent.getWorkflowVersionId()],
        evaluationInput: parent.getEvaluationInput(),
        _evolutionContext: parent.getEvolutionContext(),
        operation: "mutation",
      })

      if (mutationError || !mutatedGenome) {
        lgg.error("Mutation failed generating genome:", mutationError)
        return R.error(mutationError, totalMutationCost)
      }

      const finalCost = (mutationCost ?? 0) + totalMutationCost
      mutatedGenome.addCost(finalCost)
      return R.success(mutatedGenome, finalCost)
    } catch (error) {
      lgg.error("Mutation failed generating genome:", error)
      failureTracker.trackMutationFailure()
      return R.error(`Mutation failed generating genome${truncater(JSON.stringify(error), 1000)}`, 0)
    }
  }

  /**
   * Selects a mutation type based on weighted probability distribution.
   *
   * @param evolutionMode - The evolution mode that determines available mutations
   * @returns The selected mutation type
   *
   * @remarks
   * Filters mutation weights to only include mutations valid for the evolution mode,
   * then uses weighted random selection to choose a mutation type.
   */
  private static selectMutationType(evolutionMode: FlowEvolutionMode): MutationType {
    const availableMutations = getEvolutionMutations(evolutionMode)

    // filter mutation weights to only include available mutations
    const validWeights = MUTATION_WEIGHTS.filter(w => availableMutations.includes(w.type))

    if (validWeights.length === 0) {
      lgg.warn(`No valid mutations for ${evolutionMode} mode, falling back to model`)
      return "model"
    }

    // normalize weights for probability distribution
    const totalWeight = validWeights.reduce((sum, w) => sum + w.weight, 0)
    const rand = Math.random() * totalWeight
    let cumulativeWeight = 0

    // weighted random selection using cumulative distribution
    for (const mutationWeight of validWeights) {
      cumulativeWeight += mutationWeight.weight
      if (rand < cumulativeWeight) {
        return mutationWeight.type
      }
    }

    // fallback to first available mutation (should never reach here)
    lgg.warn("No mutation type selected, falling back to first available")
    return validWeights[0].type
  }

  /**
   * Executes a specific mutation type on the workflow configuration.
   *
   * @param mutationType - The type of mutation to apply
   * @param config - The workflow configuration to mutate (modified in-place)
   * @param parent - The parent genome providing context
   * @param intensity - Mutation strength affecting scope of changes
   * @returns The cost in USD of executing the mutation
   */
  private static async executeMutation(
    mutationType: MutationType,
    config: WorkflowConfig,
    parent: Genome,
    intensity: number,
  ): Promise<number> {
    switch (mutationType) {
      case "model":
        await MutationCoordinator.modelMutation.execute(config)
        return 0

      case "prompt":
        return await MutationCoordinator.promptMutation.execute(config, parent, intensity)

      case "tool":
        return await MutationCoordinator.toolMutation.execute(config, parent, intensity)

      case "structure":
        await MutationCoordinator.structureMutation.execute(config)
        return 0

      case "addNode":
        await NodeOperations.addNode.execute(config, parent)
        return 0

      case "deleteNode":
        await NodeOperations.deleteNode.execute(config)
        return 0

      case "iterative": {
        try {
          const fitness = parent.getFitness()
          if (!fitness) {
            lgg.warn("Iterative mutation skipped: no fitness available")
            return 0
          }
          const result = await improveWorkflowUnified({
            config,
            fitness,
            feedback: parent.getFeedback() ?? "No feedback available",
          })
          if (result.improvedConfig) {
            // directly modify config following mutation pattern
            config.nodes = result.improvedConfig.nodes
            config.entryNodeId = result.improvedConfig.entryNodeId
          }
          return result.cost
        } catch (error) {
          lgg.error("Iterative mutation failed:", error)
          return 0
        }
      }

      default: {
        const _exhaustiveCheck: never = mutationType
        void _exhaustiveCheck
        lgg.warn(`Unknown mutation type: ${mutationType}`)
        return 0
      }
    }
  }
}
