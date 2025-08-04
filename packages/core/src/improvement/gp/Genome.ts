// genome.ts
/**
 * Simple Genome implementation for prompt evolution
 */

import type { FlowEvolutionMode } from "@/interfaces/runtimeConfig"
import { SharedWorkflowPrompts } from "@/prompts/workflowAnalysisPrompts"
import { CONFIG } from "@/runtime/settings/constants"
import { isNir } from "@/utils/common/isNir"
import { truncater } from "@/utils/common/llmify"
import { genShortId } from "@/utils/common/utils"
import { lgg } from "@/utils/logging/Logger"
import {
  createWorkflowVersion,
  ensureWorkflowExists,
} from "@/utils/persistence/workflow/registerWorkflow"
import { ACTIVE_MODEL_NAMES } from "@/utils/spending/pricing"
import { R, type RS } from "@/utils/types"
import type { FitnessOfWorkflow } from "@/workflow/actions/analyze/calculate-fitness/fitness.types"
import type { EvaluationInput } from "@/workflow/ingestion/ingestion.types"
import { guard } from "@/workflow/schema/errorMessages"
import { Mutations } from "@gp/operators/Mutations"
import { createDummyGenome } from "@gp/resources/debug/dummyGenome"
import { EvolutionUtils } from "@gp/resources/utils"
import { workflowConfigToGenome } from "@gp/resources/wrappers"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import { Workflow } from "@workflow/Workflow"
import crypto from "crypto"
import type {
  GenomeEvaluationResults,
  WorkflowGenome,
} from "./resources/gp.types"
import type { EvolutionContext } from "./resources/types"

/**
 * A Genome *is* a workflow: it carries the workflow-level behaviour supplied by
 * `Workflow` and adds every genome-specific helper we already had.
 */
export class Genome extends Workflow {
  /** Persist the native representation so fingerprinting & hashing stay simple */
  public readonly genome: WorkflowGenome
  public genomeEvaluationResults: GenomeEvaluationResults
  private evolutionCost: number
  static verbose = CONFIG.logging.override.GP
  public isEvaluated = false

  /**
   * Create a `Genome` instance from an existing `WorkflowGenome` object.
   *
   * @param genome raw structural genome
   * @param evaluation text label that will be forwarded to `Workflow`
   * @param goal       the main goal forwarded to `Workflow`
   * @param workflowVersionId optional pre-existing workflow version ID
   */
  constructor(
    genome: WorkflowGenome,
    evaluationInput: EvaluationInput,
    _evolutionContext: EvolutionContext,
    workflowVersionId: string | undefined = undefined
  ) {
    super(
      Genome.toWorkflowConfig(genome),
      evaluationInput,
      _evolutionContext,
      undefined,
      workflowVersionId
    )
    this.genome = genome

    const genomeEvaluationResults: GenomeEvaluationResults = {
      workflowVersionId: this.getWorkflowVersionId(),
      hasBeenEvaluated: false,
      evaluatedAt: new Date().toISOString(),
      fitness: {
        score: 0,
        totalCostUsd: 0,
        totalTimeSeconds: 0,
        accuracy: 0,
        novelty: 0,
      },
      costOfEvaluation: 0,
      errors: [],
      feedback: null,
    }
    this.genomeEvaluationResults = genomeEvaluationResults
    this.evolutionCost = 0
  }

  /**
   * Create WorkflowVersion database entry for genome
   */
  static async createWorkflowVersion({
    genome,
    evaluationInput,
    _evolutionContext,
    operation = "init",
    parentWorkflowVersionIds,
  }: {
    genome: WorkflowGenome
    evaluationInput: EvaluationInput
    _evolutionContext: EvolutionContext
    operation?: "init" | "crossover" | "mutation" | "immigrant"
    parentWorkflowVersionIds?: string[]
  }): Promise<string> {
    const workflowVersionId = "wf_ver_" + genShortId()

    const parentIds = parentWorkflowVersionIds || []

    const parent1Id = parentIds.length === 2 ? parentIds[0] : undefined
    const parent2Id = parentIds.length === 2 ? parentIds[1] : undefined

    await ensureWorkflowExists(evaluationInput.goal, evaluationInput.workflowId)
    await createWorkflowVersion({
      workflowVersionId,
      workflowConfig: Genome.toWorkflowConfig(genome),
      commitMessage: evaluationInput.goal,
      generation: _evolutionContext.generationId,
      operation,
      parent1Id,
      parent2Id,
      workflowId: evaluationInput.workflowId,
    })

    return workflowVersionId
  }

  /**
   * Generate a *random* genome **and immediately wrap it in a runnable
   * Workflow-compatible object.**
   */
  static async createRandom({
    evaluationInput,
    baseWorkflow,
    parentWorkflowVersionIds,
    _evolutionContext,
    problemAnalysis,
    evolutionMode,
  }: {
    evaluationInput: EvaluationInput
    baseWorkflow?: WorkflowConfig
    parentWorkflowVersionIds: string[]
    _evolutionContext: EvolutionContext
    problemAnalysis: string
    evolutionMode: FlowEvolutionMode
  }): Promise<RS<Genome>> {
    try {
      // needs work: typo "bassed" should be "based"
      // do the randomness based on poisson distribution
      const randomness = EvolutionUtils.poisson(1, 4, 5)
      if (CONFIG.evolution.GP.verbose) {
        lgg.log("verbose mode: skipping workflow generation for createRandom")
        return R.success(
          createDummyGenome(parentWorkflowVersionIds, _evolutionContext),
          0
        )
      }

      if (CONFIG.evolution.initialPopulationMethod === "baseWorkflow") {
        if (!baseWorkflow) {
          return R.error(
            "Base workflow required for baseWorkflow initialization method",
            0
          )
        }
        const { data: baseWorkflowGenome } = await workflowConfigToGenome({
          workflowConfig: baseWorkflow,
          parentWorkflowVersionIds,
          evaluationInput,
          _evolutionContext,
          operation: "init",
        })
        if (!baseWorkflowGenome) {
          return R.error("Failed to create base workflow genome", 0)
        }
        const formalizedWorkflow = await Mutations.mutateWorkflowGenome({
          parent: baseWorkflowGenome,
          generationNumber: _evolutionContext.generationNumber,
          aggression: randomness,
          evolutionMode,
        })
        return formalizedWorkflow
      }
      const randomModel =
        ACTIVE_MODEL_NAMES[
          Math.floor(Math.random() * ACTIVE_MODEL_NAMES.length)
        ]

      const generatedWorkflowForGenomeFromIdea = await Workflow.ideaToWorkflow({
        prompt: `
          the goal of the workflow is: ${evaluationInput.goal}
          use one of the following patterns: ${SharedWorkflowPrompts.randomWorkflowStructure()}
          this was an analysis of the problem: ${problemAnalysis}
          `,
        randomness,
        model: randomModel, // creates novelty, ensemble method.
      })
      lgg.onlyIf(
        Genome.verbose,
        "generatedWorkflowForGenomeFromIdea",
        JSON.stringify(generatedWorkflowForGenomeFromIdea)
      )
      if (!generatedWorkflowForGenomeFromIdea.success)
        throw new Error(
          `failed to generate workflow in Genome.createRandom: ${generatedWorkflowForGenomeFromIdea.error}`
        )
      const { data: genome, usdCost } = await workflowConfigToGenome({
        workflowConfig: generatedWorkflowForGenomeFromIdea.data,
        parentWorkflowVersionIds,
        evaluationInput,
        _evolutionContext,
        operation: "init",
      })
      if (!genome) {
        return R.error("Failed to create genome", usdCost)
      }
      genome.addCost(generatedWorkflowForGenomeFromIdea.usdCost || 0)
      return R.success(genome, usdCost)
    } catch (e) {
      // needs work: use lgg.error instead of console.error for consistency
      //likely bug: using console.error instead of lgg.error breaks logging consistency
      lgg.error(
        "failed to create random genome",
        e,
        truncater(JSON.stringify(e), 1000)
      )
      return R.error(
        "Failed to create random genome " + truncater(JSON.stringify(e), 200),
        0
      )
    }
  }

  /**
   * Generate a *prepared* genome using prepareProblem to deeply understand the task first.
   * This creates genomes with informed understanding of problem boundaries and constraints.
   */
  static async createPrepared({
    evaluationInput,
    baseWorkflow,
    parentWorkflowVersionIds,
    _evolutionContext,
    problemAnalysis,
  }: {
    evaluationInput: EvaluationInput
    baseWorkflow?: WorkflowConfig
    parentWorkflowVersionIds: string[]
    _evolutionContext: EvolutionContext
    problemAnalysis: string
  }): Promise<RS<Genome>> {
    try {
      const randomness = EvolutionUtils.poisson(1, 4, 5)
      if (CONFIG.evolution.GP.verbose) {
        lgg.log("verbose mode: skipping workflow generation for createPrepared")
        return R.success(
          createDummyGenome(parentWorkflowVersionIds, _evolutionContext),
          0
        )
      }

      // Use the already-computed problem analysis passed from Workflow.prepareWorkflow()
      const enhancedAnalysis = problemAnalysis

      const randomModel =
        ACTIVE_MODEL_NAMES[
          Math.floor(Math.random() * ACTIVE_MODEL_NAMES.length)
        ]

      const generatedWorkflowForGenomeFromIdea = await Workflow.ideaToWorkflow({
        prompt: `
          the goal of the workflow is: ${evaluationInput.goal}
          use one of the following patterns: ${SharedWorkflowPrompts.randomWorkflowStructure()}
          
          problem analysis (already computed): ${enhancedAnalysis}
          
          based on this deep analysis, create a workflow that takes into account:
          - the problem boundaries and edge cases
          - the difficulty level and assumptions
          - the expected output format and requirements
          `,
        randomness,
        model: randomModel,
      })

      lgg.onlyIf(
        Genome.verbose,
        "generatedWorkflowForGenomeFromIdea (prepared)",
        JSON.stringify(generatedWorkflowForGenomeFromIdea)
      )

      if (!generatedWorkflowForGenomeFromIdea.success)
        throw new Error(
          `failed to generate workflow in Genome.createPrepared: ${generatedWorkflowForGenomeFromIdea.error}`
        )

      const { data: genome, usdCost } = await workflowConfigToGenome({
        workflowConfig: generatedWorkflowForGenomeFromIdea.data,
        parentWorkflowVersionIds,
        evaluationInput,
        _evolutionContext,
        operation: "init",
      })

      if (!genome) {
        return R.error("Failed to create prepared genome", usdCost)
      }

      genome.addCost(generatedWorkflowForGenomeFromIdea.usdCost || 0)
      return R.success(genome, usdCost)
    } catch (e) {
      lgg.error(
        "failed to create prepared genome",
        e,
        truncater(JSON.stringify(e), 1000)
      )
      return R.error(
        "Failed to create prepared genome " + truncater(JSON.stringify(e), 200),
        0
      )
    }
  }

  static toWorkflowConfig(genome: WorkflowGenome): WorkflowConfig {
    return {
      nodes: genome.nodes,
      entryNodeId: genome.entryNodeId,
    }
  }

  getWorkflowConfig(): WorkflowConfig {
    return Genome.toWorkflowConfig(this.genome)
  }

  getGoal(): string {
    return this.goal
  }

  /** Convenience helper so callers can retrieve the raw genome again. */
  getRawGenome(): WorkflowGenome {
    return this.genome
  }

  //todo-leak :: Genome stores evaluation results that persist through improvement operations
  setFitnessAndFeedback({
    fitness,
    feedback,
  }: {
    fitness: FitnessOfWorkflow
    feedback: string | null
  }): void {
    this.genomeEvaluationResults = {
      ...(this.genomeEvaluationResults || {}),
      ...fitness,
      workflowVersionId: this.getWorkflowVersionId(),
      hasBeenEvaluated: true,
      evaluatedAt: new Date().toISOString(),
      feedback,
    }

    // Use new feedback if provided, otherwise keep existing feedback
    const hasCurrentFeedback = !isNir(this.feedback)
    const hasNewFeedback = !isNir(feedback)
    this.feedback = hasNewFeedback
      ? feedback
      : hasCurrentFeedback
        ? this.feedback
        : null
    this.fitness = fitness.score > 0 ? fitness : undefined
    this.isEvaluated = true
  }

  getFitnessAndFeedback(): GenomeEvaluationResults {
    return this.genomeEvaluationResults
  }

  addCost(cost: number): void {
    this.evolutionCost += cost
  }

  /**
   * Get the evolution context from the workflow
   */
  getEvolutionContext(): EvolutionContext {
    guard(this.evolutionContext, "Evolution context not set")
    return this.evolutionContext
  }

  /**
   * Generate hash for this genome for caching
   */
  hash(): string {
    const genomeString = JSON.stringify(this.genome)
    const hash = crypto.createHash("sha256").update(genomeString).digest("hex")
    return `genome-${this.getWorkflowVersionId()}-${hash}`
  }

  /**
   * Reset genome for new generation - extends Workflow.reset() to also reset genomeEvaluationResults
   */
  reset(newEvolutionContext: EvolutionContext): void {
    super.reset(newEvolutionContext)
    // Reset genome-specific fitness to ensure re-evaluation
    this.genomeEvaluationResults = {
      workflowVersionId: this.getWorkflowVersionId(),
      hasBeenEvaluated: false,
      evaluatedAt: new Date().toISOString(),
      fitness: {
        score: 0,
        totalCostUsd: 0,
        totalTimeSeconds: 0,
        accuracy: 0,
        novelty: 0,
      },
      costOfEvaluation: 0,
      errors: [],
      feedback: null,
    }
    this.isEvaluated = false
  }
}
