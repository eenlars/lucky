/**
 * Crossover - LLM-based genetic crossover operations for workflow evolution
 *
 * This class implements sophisticated crossover strategies that combine successful
 * elements from two parent workflows to create potentially superior offspring:
 *
 * Crossover strategies:
 * - behavioralBlend: Combines decision-making and error handling patterns
 * - structureCrossover: Merges workflow structures (branching, parallelism)
 * - patternFusion: Fuses successful tool usage and processing patterns
 * - hybrid: Combines elements from all three strategies
 *
 * Key features:
 * - LLM-driven crossover using natural language instructions
 * - Fitness and feedback-aware combination strategies
 * - Memory preservation across crossover operations
 * - Robust validation and error handling with failure tracking
 * - Integration with workflow formalization and verification systems
 *
 * TODO: implement crossover success metrics and strategy adaptation
 * TODO: add crossover diversity measures to prevent convergence
 * TODO: implement multi-parent crossover for complex trait combinations
 */

import { CONFIG } from "@core/core-config/compat"
import type { Genome } from "@core/improvement/gp/Genome"
import {
  getCrossoverVariability,
  selectCrossoverType,
} from "@core/improvement/gp/operators/crossover/crossoverStrategy"
import { createDummyGenome } from "@core/improvement/gp/resources/debug/dummyGenome"
import { failureTracker } from "@core/improvement/gp/resources/tracker"
import { workflowConfigToGenome } from "@core/improvement/gp/resources/wrappers"
import { GENERALIZATION_LIMITS } from "@core/prompts/generalizationLimits"
import { lgg } from "@core/utils/logging/Logger"
import { verifyWorkflowConfig } from "@core/utils/validation/workflow/verifyWorkflow"
import { formalizeWorkflow } from "@core/workflow/actions/generate/formalizeWorkflow"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import { R, type RS } from "@lucky/shared"
import type { EvolutionContext } from "../../resources/types"

const operatorsWithFeedback = CONFIG.improvement.flags.operatorsWithFeedback

export class Crossover {
  /**
   * Builds crossover prompt that describes the operation conceptually
   * rather than expecting raw JSON generation.
   *
   * @param parent1 - First parent genome
   * @param parent2 - Second parent genome
   * @param crossoverType - Type of crossover operation
   * @param aggression - Intensity level description
   * @param instructions - Specific crossover instructions
   * @returns Formatted prompt for LLM crossover
   *
   * @remarks
   * Creates natural language instructions for LLM to understand
   * crossover goals without requiring JSON manipulation
   */
  private static buildCrossoverPrompt(
    parent1: Genome,
    parent2: Genome,
    crossoverType: string,
    aggression: string,
    instructions: string,
  ): string {
    const options = {
      includeToolExplanations: true,
      includeAdjacencyList: true,
      includeAgents: true,
      includeMemory: true,
      easyModelNames: true,
    }

    // safely stringify fitness; parents may not have been evaluated yet
    // this prevents crashes when accessing fitness of unevaluated genomes
    const safeFitnessString = (genome: Genome): string => {
      try {
        return JSON.stringify(genome.getFitness())
      } catch {
        return "null"
      }
    }

    // TODO: improve error messages with parent identifiers for debugging
    // TODO: implement fallback strategies when feedback is missing
    if (!parent1.getFeedback() && operatorsWithFeedback)
      lgg.error(`Crossover not going well: parent1 ${parent1.getWorkflowVersionId()} has no feedback`)
    if (!parent2.getFeedback() && operatorsWithFeedback)
      lgg.error(`Crossover not going well: parent2 ${parent2.getWorkflowVersionId()} has no feedback`)

    return `Create a new workflow by performing crossover between these two parent workflows:

# PARENT 1:

### Workflow of first parent
${parent1.toString(options)}

${
  operatorsWithFeedback
    ? `### Feedback from first parent after evaluation
${parent1.getFeedback()}`
    : ""
}

### Fitness of first parent after evaluation
${safeFitnessString(parent1)}

# PARENT 2:

### Workflow of second parent
${parent2.toString(options)}  

${
  operatorsWithFeedback
    ? `### Feedback from second parent after evaluation
${parent2.getFeedback()}`
    : ""
}

### Fitness of second parent after evaluation
${safeFitnessString(parent2)}

CROSSOVER OPERATION: ${crossoverType}
AGGRESSION LEVEL (how subtle the crossover is): ${aggression}

INSTRUCTIONS:
${instructions}

Create a hybrid workflow that combines the best elements from both parents. Focus on crossing over behavioral types (like decision-making strategies, error handling approaches), structures (like parallel vs sequential processing), and interesting patterns that have proven successful based on their ${
      operatorsWithFeedback ? "feedback and " : ""
    }fitness scores. The resulting workflow should:
- Maintain valid connectivity and logic flow
- Preserve essential functionality from both parents
- Introduce beneficial variations based on the crossover type
- Follow proper tool usage patterns
- Have a coherent execution path from entry to completion
- Remain highly functional for the following goal: "${parent1.getGoal()}"
 
${GENERALIZATION_LIMITS}

Focus on creating a functional workflow rather than exact JSON structure.`
  }

  /**
   * Performs crossover between two parent genomes using LLM.
   *
   * @param parents - Array of parent genomes (requires exactly 2)
   * @param verbose - Whether to use verbose/dummy mode
   * @param evaluationInput - Input for workflow evaluation
   * @param _evolutionContext - Evolution context for the offspring
   * @returns Result containing offspring genome or error
   *
   * @remarks
   * - Selects crossover strategy dynamically
   * - Uses LLM to generate conceptual crossover
   * - Preserves memory from both parents
   * - Validates offspring workflow before returning
   *
   * @throws Error if fewer than 2 parents provided
   */
  static async crossover({
    parents,
    verbose,
    evaluationInput,
    _evolutionContext,
  }: {
    parents: Genome[]
    verbose: boolean
    evaluationInput: EvaluationInput
    _evolutionContext: EvolutionContext
  }): Promise<RS<Genome>> {
    const parentWorkflowVersionIds = parents.map(p => p.getWorkflowVersionId())
    const [parent1, parent2] = parents

    if (CONFIG.evolution.GP.verbose || verbose) {
      lgg.log(`Crossover between ${parentWorkflowVersionIds.join(", ")}`)
      return {
        success: true,
        data: createDummyGenome(parentWorkflowVersionIds, _evolutionContext),
        error: undefined,
        usdCost: 0,
      }
    }

    if (parents.length < 2) {
      lgg.error("Crossover requires at least 2 parents")
      throw new Error("Crossover failed: insufficient parents")
    }

    // TODO: document crossover algorithm pseudocode or remove references
    // TODO: implement adaptive crossover type selection based on parent fitness
    // Select crossover strategy and intensity based on evolutionary context
    const crossoverType = selectCrossoverType()
    const { aggressiveness, intensity } = getCrossoverVariability()

    let crossoverInstructions = ""

    switch (crossoverType) {
      case "behavioralBlend":
        crossoverInstructions = `Perform a behavioral blend crossover with aggression ${intensity}/1.0:
        - Start with parent1 as the base workflow
        - Identify behavioral patterns in both parents from their feedback (e.g., how they handle uncertainties, make decisions, or recover from errors)
        - Blend these behaviors to create hybrid approaches
        - Higher aggression means more dominance from parent2's behaviors
        - Preserve overall structure while enhancing behaviors`
        break

      case "structureCrossover":
        crossoverInstructions = `Perform a structure crossover with aggression ${intensity}/1.0:
        - Analyze high-level structures in both parents (e.g., branching patterns, merge points, parallel paths)
        - Combine structural elements that led to success in feedback
        - Aggression ${intensity} determines how much structural change to apply
        - Maintain behavioral consistency while evolving structure`
        break

      case "patternFusion":
        crossoverInstructions = `Perform a pattern fusion crossover with aggression ${intensity}/1.0:
        - Identify interesting successful patterns from both parents' feedback (e.g., tool usage sequences, data processing motifs)
        - Fuse these patterns into a new coherent workflow
        - Aggression level controls how aggressively to combine patterns
        - Create innovative combinations that could prove highly successful`
        break

      case "hybrid":
        crossoverInstructions = `Perform a hybrid crossover combining behavioral, structural, and pattern strategies with aggression ${intensity}/1.0:
        - Apply elements of behavioralBlend, structureCrossover, and patternFusion
        - Balance changes across behaviors, structures, and patterns
        - Use aggression level to control overall modification intensity`
        break
      default: {
        const _exhaustiveCheck: never = crossoverType
        void _exhaustiveCheck
        break
      }
    }

    // Use formalizeWorkflow approach like in Mutations.ts to avoid schema issues
    try {
      const crossoverPrompt = Crossover.buildCrossoverPrompt(
        parent1,
        parent2,
        crossoverType,
        aggressiveness,
        crossoverInstructions,
      )

      const { data: workflowConfig, error } = await formalizeWorkflow(crossoverPrompt, {
        workflowConfig: parent1.getWorkflowConfig(),
        verifyWorkflow: "normal",
        repairWorkflowAfterGeneration: true,
      })
      console.log("[Crossover DEBUG] formalize returned data?", !!workflowConfig)

      if (workflowConfig) {
        // preserve memories from both parents to maintain learned knowledge
        // crossover should combine memories, not lose them
        const { MemoryPreservation } = await import("../memoryPreservation")
        MemoryPreservation.preserveCrossoverMemory(workflowConfig, parent1, parent2)

        // enforce memory preservation - throw error if any memories were lost
        // this is critical for maintaining knowledge across generations
        MemoryPreservation.enforceMemoryPreservation(workflowConfig, [parent1, parent2], "crossover")

        const verifyResult = await verifyWorkflowConfig(workflowConfig, {
          throwOnError: false,
          verbose: false,
        })
        console.log("[Crossover DEBUG] verifyWorkflowConfig result:", verifyResult)

        const { isValid, errors: verifyErrors } =
          verifyResult && typeof verifyResult === "object"
            ? (verifyResult as { isValid: boolean; errors: string[] })
            : { isValid: true, errors: [] as string[] }
        if (!isValid) {
          lgg.error("Crossover failed: invalid workflow after verifying", verifyErrors)
          failureTracker.trackCrossoverFailure() // Track verification failure
          return R.error("Crossover failed: invalid workflow after verifying", 0)
        }
        if (verifyErrors.length > 0) {
          lgg.error("Crossover failed: error verifying workflow", verifyErrors)
          failureTracker.trackCrossoverFailure() // Track verification error
          return R.error("Crossover failed: error verifying workflow", 0)
        }
        const wfToGenomeResp = await workflowConfigToGenome({
          workflowConfig,
          parentWorkflowVersionIds,
          evaluationInput,
          _evolutionContext,
          operation: "crossover",
        })
        if (!wfToGenomeResp || typeof wfToGenomeResp !== "object") {
          lgg.error("Crossover failed: no data (invalid response from workflowConfigToGenome)")
          failureTracker.trackCrossoverFailure()
          return R.error("Crossover failed: no data", 0)
        }
        const { data, error, usdCost: crossoverCost } = wfToGenomeResp
        console.log("[Crossover DEBUG] workflowConfigToGenome success?", !!data)
        if (!data) {
          lgg.error("Crossover failed: no data", error)
          failureTracker.trackCrossoverFailure() // Track genome creation failure
          return R.error("Crossover failed: no data", 0)
        }
        return R.success(data, crossoverCost)
      }
      lgg.error("formalizeWorkflow returned no valid workflow", error)
      console.log("[Crossover DEBUG] formalizeWorkflow returned no valid workflow", error)
      failureTracker.trackCrossoverFailure() // Track workflow formalization failure
      return R.error(`formalizeWorkflow returned no valid workflow${error ? `: ${error}` : ""}`, 0)
    } catch (error) {
      lgg.error("llm crossover failed for parents", parentWorkflowVersionIds, error)
      console.log("[Crossover DEBUG] exception:", error)
      failureTracker.trackCrossoverFailure() // Track exception failure
      // TODO: include specific error details in error message for debugging
      return R.error(`Crossover failed: ${error instanceof Error ? error.message : String(error)}`, 0)
    }
  }
}
