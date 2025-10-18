// genome.ts
/**
 * Genome - Core abstraction for workflow genomes in genetic programming
 *
 * This class extends Workflow to provide genetic programming capabilities:
 * - Manages workflow configurations as genomes that can be evolved
 * - Handles fitness evaluation and feedback from workflow execution
 * - Supports creation of random/prepared genomes for initial population
 * - Provides genome-specific operations like hashing and reset
 *
 * Key responsibilities:
 * - WorkflowGenome persistence and conversion to/from WorkflowConfig
 * - Fitness and feedback management from evaluation results
 * - Database integration for workflow version tracking
 * - Evolution context management across generations
 *
 * @see Workflow - Base class providing workflow execution capabilities
 * @see WorkflowGenome - Raw genome representation structure
 */

import crypto from "node:crypto"
import { getCoreConfig, isLoggingEnabled } from "@core/core-config/coreConfig"
import type { FitnessOfWorkflow } from "@core/evaluation/calculate-fitness/fitness.types"
import { MutationCoordinator } from "@core/improvement/gp/operators/mutations/MutationCoordinator"
import { createDummyGenome } from "@core/improvement/gp/rsc/debug/dummyGenome"
import { EvolutionUtils } from "@core/improvement/gp/rsc/utils"
import { workflowConfigToGenome } from "@core/improvement/gp/rsc/wrappers"
import { SharedWorkflowPrompts } from "@core/prompts/workflowAnalysisPrompts"
import type { FlowEvolutionMode } from "@core/types"
import { truncater } from "@core/utils/common/llmify"
import { lgg } from "@core/utils/logging/Logger"
import { createWorkflowVersion, ensureWorkflowExists } from "@core/utils/persistence/workflow/registerWorkflow"
import { getActiveModelNames } from "@core/utils/spending/functions"
import { Workflow } from "@core/workflow/Workflow"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import { guard } from "@core/workflow/schema/errorMessages"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import { R, type RS, genShortId } from "@lucky/shared"
import { isNir } from "@lucky/shared"
import type { IPersistence } from "@together/adapter-supabase"
import type { EvolutionContext, GenomeEvaluationResults, WorkflowGenome } from "./rsc/gp.types"

/**
 * A Genome *is* a workflow: it carries the workflow-level behaviour supplied by
 * `Workflow` and adds every genome-specific helper we already had.
 *
 * TODO: Consider separating genome-specific logic from workflow execution logic
 * TODO: Add genome validation before operations (fitness assignment, crossover)
 * TODO: Implement genome serialization/deserialization for checkpointing
 */
export class Genome extends Workflow {
  /** Persist the native representation so fingerprinting & hashing stay simple */
  public readonly genome: WorkflowGenome
  public genomeEvaluationResults: GenomeEvaluationResults
  private evolutionCost: number
  static verbose = isLoggingEnabled("GP")
  public isEvaluated = false

  /**
   * Create a `Genome` instance from an existing `WorkflowGenome` object.
   *
   * @param genome - Raw structural genome representation
   * @param evaluationInput - Input data for workflow evaluation including goal and context
   * @param _evolutionContext - Evolution context including generation info and run details
   * @param workflowVersionId - Optional pre-existing workflow version ID from database
   */
  constructor(
    genome: WorkflowGenome,
    evaluationInput: EvaluationInput,
    _evolutionContext: EvolutionContext,
    workflowVersionId: string | undefined = undefined,
  ) {
    super(Genome.toWorkflowConfig(genome), evaluationInput, _evolutionContext, undefined, workflowVersionId)
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
    persistence,
    genome,
    evaluationInput,
    _evolutionContext,
    operation = "init",
    parentWorkflowVersionIds,
  }: {
    persistence: IPersistence | undefined
    genome: WorkflowGenome
    evaluationInput: EvaluationInput
    _evolutionContext: EvolutionContext
    operation?: "init" | "crossover" | "mutation" | "immigrant"
    parentWorkflowVersionIds?: string[]
  }): Promise<string> {
    const workflowVersionId = `wf_ver_${genShortId()}`

    // If no persistence, just return the ID
    if (!persistence) {
      return workflowVersionId
    }

    const parentIds = parentWorkflowVersionIds || []
    const parent1Id = parentIds.length === 2 ? parentIds[0] : undefined
    const parent2Id = parentIds.length === 2 ? parentIds[1] : undefined

    await ensureWorkflowExists(persistence, evaluationInput.goal, evaluationInput.workflowId)
    await createWorkflowVersion({
      persistence,
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
      const config = getCoreConfig()
      // apply poisson distribution for mutation aggression randomness
      // poisson(1, 4, 5) generates values between 1-5 with bias towards lower values
      const randomness = EvolutionUtils.poisson(1, 4, 5)

      // in verbose mode, skip expensive workflow generation for testing
      if (config.evolution.GP.verbose) {
        lgg.log("verbose mode: skipping workflow generation for createRandom")
        return R.success(createDummyGenome(parentWorkflowVersionIds, _evolutionContext), 0)
      }

      // baseWorkflow method: start from existing workflow and mutate it
      if (config.evolution.GP.initialPopulationMethod === "baseWorkflow") {
        if (!baseWorkflow) {
          return R.error("Base workflow required for baseWorkflow initialization method", 0)
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
        // apply random mutations to create diversity from base workflow
        const formalizedWorkflow = await MutationCoordinator.mutateWorkflowGenome({
          parent: baseWorkflowGenome,
          generationNumber: _evolutionContext.generationNumber,
          intensity: randomness,
          evolutionMode,
        })
        return formalizedWorkflow
      }

      // default method: generate completely new workflow from scratch
      // select random model for diversity in initial population
      const activeModels = getActiveModelNames()
      const randomModel = activeModels[Math.floor(Math.random() * activeModels.length)]

      const generatedWorkflowForGenomeFromIdea = await Workflow.ideaToWorkflow({
        prompt: `
          the goal of the workflow is: ${evaluationInput.goal}
          use one of the following patterns: ${SharedWorkflowPrompts.randomWorkflowStructure()}
          this was an analysis of the problem: ${problemAnalysis}
          `,
        randomness,
        model: randomModel, // ensemble method.
      })
      lgg.onlyIf(
        Genome.verbose,
        "generatedWorkflowForGenomeFromIdea",
        JSON.stringify(generatedWorkflowForGenomeFromIdea),
      )
      if (!generatedWorkflowForGenomeFromIdea.success)
        throw new Error(
          `failed to generate workflow in Genome.createRandom: ${generatedWorkflowForGenomeFromIdea.error}`,
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
      // TODO: implement proper error handling with lgg.error throughout
      // TODO: add metrics tracking for random genome generation failures
      lgg.error("failed to create random genome", e, truncater(JSON.stringify(e), 1000))
      return R.error(`Failed to create random genome ${truncater(JSON.stringify(e), 200)}`, 0)
    }
  }

  /**
   * Generate a *prepared* genome using prepareProblem to deeply understand the task first.
   * This creates genomes with informed understanding of problem boundaries and constraints.
   */
  static async createPrepared({
    evaluationInput,
    baseWorkflow: _baseWorkflow,
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
      const config = getCoreConfig()
      const randomness = EvolutionUtils.poisson(1, 4, 5)
      if (config.evolution.GP.verbose) {
        lgg.log("verbose mode: skipping workflow generation for createPrepared")
        return R.success(createDummyGenome(parentWorkflowVersionIds, _evolutionContext), 0)
      }

      // Use the already-computed problem analysis passed from Workflow.prepareWorkflow()
      const enhancedAnalysis = problemAnalysis

      const activeModels = getActiveModelNames()
      const randomModel = activeModels[Math.floor(Math.random() * activeModels.length)]

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
        JSON.stringify(generatedWorkflowForGenomeFromIdea),
      )

      if (!generatedWorkflowForGenomeFromIdea.success)
        throw new Error(
          `failed to generate workflow in Genome.createPrepared: ${generatedWorkflowForGenomeFromIdea.error}`,
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
      lgg.error("failed to create prepared genome", e, truncater(JSON.stringify(e), 1000))
      return R.error(`Failed to create prepared genome ${truncater(JSON.stringify(e), 200)}`, 0)
    }
  }

  /**
   * Converts a WorkflowGenome to a WorkflowConfig.
   *
   * @param genome - The genome to convert
   * @returns WorkflowConfig containing nodes and entry node ID
   */
  static toWorkflowConfig(genome: WorkflowGenome): WorkflowConfig {
    return {
      nodes: genome.nodes,
      entryNodeId: genome.entryNodeId,
    }
  }

  /**
   * Gets the workflow configuration from this genome.
   *
   * @returns The workflow configuration
   */
  getWorkflowConfig(): WorkflowConfig {
    return Genome.toWorkflowConfig(this.genome)
  }

  /**
   * Gets the goal/objective for this genome's workflow.
   *
   * @returns The workflow goal string
   */
  getGoal(): string {
    return this.goal
  }

  /**
   * Convenience helper so callers can retrieve the raw genome again.
   *
   * @returns The raw WorkflowGenome structure
   */
  getRawGenome(): WorkflowGenome {
    return this.genome
  }

  /**
   * Sets the fitness score and feedback for this genome after evaluation.
   *
   * @param fitness - The fitness metrics from workflow evaluation
   * @param feedback - Human-readable feedback about performance
   *
   * @remarks
   * Updates both genomeEvaluationResults and base workflow properties.
   * Marks the genome as evaluated.
   * Uses explicit field assignment instead of object spread to prevent data corruption.
   */
  setFitnessAndFeedback({ fitness, feedback }: { fitness: FitnessOfWorkflow; feedback: string | null }): void {
    // Explicit field assignment to prevent object spread corruption
    this.genomeEvaluationResults = {
      workflowVersionId: this.getWorkflowVersionId(),
      hasBeenEvaluated: true,
      evaluatedAt: new Date().toISOString(),
      fitness: {
        score: fitness.score,
        totalCostUsd: fitness.totalCostUsd,
        totalTimeSeconds: fitness.totalTimeSeconds,
        accuracy: fitness.accuracy,
      },
      costOfEvaluation: this.genomeEvaluationResults?.costOfEvaluation || 0,
      errors: this.genomeEvaluationResults?.errors || [],
      feedback: feedback,
    }

    // Use new feedback if provided, otherwise keep existing feedback
    const hasCurrentFeedback = !isNir(this.feedback)
    const hasNewFeedback = !isNir(feedback)
    this.feedback = hasNewFeedback ? feedback : hasCurrentFeedback ? this.feedback : null
    this.fitness = fitness.score > 0 ? fitness : undefined
    this.isEvaluated = true
  }

  /**
   * Clears evaluation state to prevent data leakage between generations.
   * Should be called before genetic operations (crossover, mutation) to ensure isolation.
   */
  override clearEvaluationState(): void {
    super.clearEvaluationState()
    this.isEvaluated = false
    this.genomeEvaluationResults = {
      workflowVersionId: this.getWorkflowVersionId(),
      hasBeenEvaluated: false,
      evaluatedAt: new Date().toISOString(),
      fitness: {
        score: 0,
        totalCostUsd: 0,
        totalTimeSeconds: 0,
        accuracy: 0,
      },
      costOfEvaluation: 0,
      errors: [],
      feedback: null,
    }
  }

  /**
   * Gets the complete evaluation results for this genome.
   *
   * @returns Evaluation results including fitness, feedback, and metadata
   */
  getFitnessAndFeedback(): GenomeEvaluationResults {
    return this.genomeEvaluationResults
  }

  /**
   * Adds to the cumulative evolution cost for this genome.
   *
   * @param cost - The cost in USD to add
   */
  addCost(cost: number): void {
    this.evolutionCost += cost
  }

  /**
   * Get the evolution context from the workflow.
   *
   * @returns The evolution context containing generation and run information
   * @throws Error if evolution context is not set
   */
  getEvolutionContext(): EvolutionContext {
    guard(this.evolutionContext, "Evolution context not set")
    return this.evolutionContext
  }

  /**
   * Generate a unique hash for this genome for caching and deduplication.
   *
   * @returns SHA256 hash of the genome structure prefixed with workflow version ID
   *
   * @remarks
   * Used for caching evaluation results and detecting duplicate genomes
   */
  hash(): string {
    const genomeString = JSON.stringify(this.genome)
    const hash = crypto.createHash("sha256").update(genomeString).digest("hex")
    return `genome-${this.getWorkflowVersionId()}-${hash}`
  }

  /**
   * Reset genome for new generation - extends Workflow.reset() to also reset genomeEvaluationResults
   *
   * TODO: ensure all genome state is properly cleared (check for missed fields)
   * TODO: add validation that reset was successful
   * TODO: consider implementing a genome state snapshot/restore mechanism
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
      },
      costOfEvaluation: 0,
      errors: [],
      feedback: null,
    }
    this.isEvaluated = false
  }
}
