// Crossover.ts
/**
 * llm-based crossover operations for prompt evolution
 */

import type { Genome } from "@core/improvement/gp/Genome"
import {
  getCrossoverVariability,
  selectCrossoverType,
} from "@core/improvement/gp/operators/crossover/crossoverStrategy"
import { createDummyGenome } from "@core/improvement/gp/resources/debug/dummyGenome"
import { failureTracker } from "@core/improvement/gp/resources/tracker"
import { workflowConfigToGenome } from "@core/improvement/gp/resources/wrappers"
import { lgg } from "@core/utils/logging/Logger"
import { R, type RS } from "@core/utils/types"
import { verifyWorkflowConfig } from "@core/utils/validation/workflow"
import { formalizeWorkflow } from "@core/workflow/actions/generate/formalizeWorkflow"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import { CONFIG } from "@runtime/settings/constants"
import type { EvolutionContext } from "../../resources/types"

const operatorsWithFeedback = CONFIG.improvement.flags.operatorsWithFeedback

export class Crossover {
  /**
   * Build crossover prompt that describes the operation conceptually
   * rather than expecting raw JSON generation
   */
  private static buildCrossoverPrompt(
    parent1: Genome,
    parent2: Genome,
    crossoverType: string,
    aggression: string,
    instructions: string
  ): string {
    const options = {
      includeToolExplanations: true,
      includeAdjacencyList: true,
      includeAgents: true,
      includeMemory: true,
      easyModelNames: true,
    }

    // needs work: error messages should include parent identifiers for debugging
    if (!parent1.getFeedback() && operatorsWithFeedback)
      lgg.error("Crossover not going well: parent1 has no feedback")
    if (!parent2.getFeedback() && operatorsWithFeedback)
      lgg.error("Crossover not going well: parent2 has no feedback")

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
${JSON.stringify(parent1.getFitness())}

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
${JSON.stringify(parent2.getFitness())}

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

Focus on creating a functional workflow rather than exact JSON structure.`
  }

  /**
   * perform crossover between two parents using llm
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
    const parentWorkflowVersionIds = parents.map((p) =>
      p.getWorkflowVersionId()
    )
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

    // needs work: comments reference undefined pseudocode - should be more specific
    // follow pseudocode: child = deepClone(parent1)
    // choose crossover plan based on aggression (weighted choice from pseudocode)
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
    }

    // Use formalizeWorkflow approach like in Mutations.ts to avoid schema issues
    try {
      const crossoverPrompt = this.buildCrossoverPrompt(
        parent1,
        parent2,
        crossoverType,
        aggressiveness,
        crossoverInstructions
      )

      const { data: workflowConfig, error } = await formalizeWorkflow(
        crossoverPrompt,
        {
          workflowConfig: parent1.getWorkflowConfig(),
          verifyWorkflow: "normal",
          repairWorkflowAfterGeneration: true,
        }
      )

      if (workflowConfig) {
        // preserve memories from both parents
        const { MemoryPreservation } = await import("../memoryPreservation")
        MemoryPreservation.preserveCrossoverMemory(
          workflowConfig,
          parent1,
          parent2
        )

        // enforce memory preservation - throw error if any memories were lost
        MemoryPreservation.enforceMemoryPreservation(
          workflowConfig,
          [parent1, parent2],
          "crossover"
        )

        const { isValid, errors: verifyErrors } = await verifyWorkflowConfig(
          workflowConfig,
          {
            throwOnError: false,
            verbose: false,
          }
        )
        if (!isValid) {
          lgg.error(
            "Crossover failed: invalid workflow after verifying",
            verifyErrors
          )
          failureTracker.trackCrossoverFailure() // Track verification failure
          return R.error(
            "Crossover failed: invalid workflow after verifying",
            0
          )
        }
        if (verifyErrors.length > 0) {
          lgg.error("Crossover failed: error verifying workflow", verifyErrors)
          failureTracker.trackCrossoverFailure() // Track verification error
          return R.error("Crossover failed: error verifying workflow", 0)
        }
        const {
          data,
          error,
          usdCost: crossoverCost,
        } = await workflowConfigToGenome({
          workflowConfig,
          parentWorkflowVersionIds,
          evaluationInput,
          _evolutionContext,
          operation: "crossover",
        })
        if (!data) {
          lgg.error("Crossover failed: no data", error)
          failureTracker.trackCrossoverFailure() // Track genome creation failure
          return R.error("Crossover failed: no data", 0)
        }
        return R.success(data, crossoverCost)
      } else {
        lgg.error("formalizeWorkflow returned no valid workflow", error)
        failureTracker.trackCrossoverFailure() // Track workflow formalization failure
        return R.error(
          "formalizeWorkflow returned no valid workflow" +
            (error ? `: ${error}` : ""),
          0
        )
      }
    } catch (error) {
      lgg.error(
        "llm crossover failed for parents",
        parentWorkflowVersionIds,
        error
      )
      failureTracker.trackCrossoverFailure() // Track exception failure
      // needs work: error should include actual error details
      return R.error("Crossover failed: error", 0)
    }
  }
}
