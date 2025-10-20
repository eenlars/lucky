/**
 * RunService - Evolution run lifecycle management
 *
 * Modified version that accepts optional persistence.
 * When persistence is not provided, generates local IDs.
 */

import type { EvolutionSettings, IterativeConfig } from "@core/improvement/gp/rsc/evolution-types"
import type { EvolutionContext } from "@core/improvement/gp/rsc/gp.types"
import type { FlowEvolutionMode } from "@core/types"
import { RunTrackingError } from "@core/utils/errors/evolution-errors"
import { lgg } from "@core/utils/logging/Logger"
import { type Tables, type TablesInsert, type TablesUpdate, genShortId } from "@lucky/shared"
import { JSONN } from "@lucky/shared"
import { isNir } from "@lucky/shared"
import type { IEvolutionPersistence, IPersistence } from "@together/adapter-supabase"
import type { Genome } from "./Genome"
import type { PopulationStats } from "./rsc/gp.types"

type WorkflowOperator = "init" | "crossover" | "mutation" | "immigrant"

export class RunService {
  private runId?: string
  private currentGenerationId?: string
  private currentGenerationNumber = 0
  private verbose: boolean
  private evolutionMode: FlowEvolutionMode
  private evolutionPersistence?: IEvolutionPersistence
  private mainPersistence?: IPersistence

  constructor(
    verbose = false,
    evolutionMode: FlowEvolutionMode = "GP",
    restartRunId?: string,
    persistence?: IPersistence,
  ) {
    this.verbose = verbose
    this.runId = restartRunId
    this.evolutionMode = evolutionMode
    this.mainPersistence = persistence
    this.evolutionPersistence = persistence?.evolution
  }

  getEvolutionMode(): FlowEvolutionMode {
    return this.evolutionMode
  }

  getEvolutionContext(): EvolutionContext {
    return {
      runId: this.getRunId(),
      generationId: this.getCurrentGenerationId(),
      generationNumber: this.currentGenerationNumber,
    }
  }

  getRunId(): string {
    if (!this.runId) {
      throw new RunTrackingError("No active run found. Create a run first before accessing its ID.", {
        operation: "getRunId",
      })
    }
    return this.runId
  }

  getCurrentGenerationId(): string {
    if (!this.currentGenerationId) {
      throw new RunTrackingError("No active generation found. Create a generation first before accessing its ID.", {
        operation: "getCurrentGenerationId",
        runId: this.runId,
      })
    }
    return this.currentGenerationId
  }

  async createRun(
    inputText: string,
    config: EvolutionSettings | IterativeConfig,
    continueRunId?: string,
  ): Promise<void> {
    if (continueRunId && this.evolutionPersistence) {
      const lastCompletedGeneration = await this.evolutionPersistence.getLastCompletedGeneration(continueRunId)
      if (lastCompletedGeneration) {
        this.runId = lastCompletedGeneration.runId
        this.currentGenerationId = lastCompletedGeneration.generationId
        this.currentGenerationNumber = lastCompletedGeneration.generationNumber
        return
      }
      throw new RunTrackingError(
        `Cannot continue from run '${continueRunId}'. No completed generations found for this run.`,
        {
          runId: continueRunId,
          operation: "createRun (continue mode)",
        },
      )
    }

    let notes = ""
    if (config.mode === "iterative") {
      notes = `Iterative Evolution Run - Iter: ${config.iterations}`
    } else {
      notes = `GP Evolution Run - Pop: ${config.populationSize}, Gen: ${config.generations}`
    }

    // Create run (with persistence or locally)
    if (this.evolutionPersistence) {
      this.runId = await this.evolutionPersistence.createRun({
        goalText: inputText,
        config: config,
        status: "running",
        evolutionType: config.mode === "iterative" ? "iterative" : "gp",
        notes,
      })

      // Create initial generation
      this.currentGenerationId = await this.evolutionPersistence.createGeneration({
        generationNumber: 0,
        runId: this.runId,
      })
    } else {
      // Local IDs when no persistence
      this.runId = `run_${genShortId()}`
      this.currentGenerationId = `gen_${genShortId()}`
    }

    if (this.verbose) {
      lgg.log(`[RunService] Initialized run ${this.runId} with generation ${this.currentGenerationId}`)
    }
  }

  async createNewGeneration(): Promise<void> {
    if (this.evolutionPersistence) {
      this.currentGenerationId = await this.evolutionPersistence.createGeneration({
        generationNumber: this.currentGenerationNumber + 1,
        runId: this.getRunId(),
      })
    } else {
      this.currentGenerationId = `gen_${genShortId()}`
    }
    this.currentGenerationNumber++
  }

  async generationExists(generationNumber: number): Promise<boolean> {
    if (!this.evolutionPersistence) return false
    const activeRunId = this.runId
    if (!activeRunId) {
      throw new RunTrackingError("Cannot check generation completion. No active run ID available.", {
        operation: "generationExists",
      })
    }
    return this.evolutionPersistence.generationExists(activeRunId, generationNumber)
  }

  async getGenerationIdByNumber(generationNumber: number, runId: string): Promise<string | null> {
    if (!this.evolutionPersistence) return null
    return this.evolutionPersistence.getGenerationIdByNumber(runId, generationNumber)
  }

  // Simplified - no longer static, uses instance persistence
  async ensureWorkflowVersion(
    genome: Genome,
    generationId: string,
    operator: WorkflowOperator = "mutation",
  ): Promise<string> {
    const workflowVersionId = genome.getWorkflowVersionId()

    if (!this.mainPersistence) {
      return workflowVersionId // Just return the ID if no persistence
    }

    // Create workflow version using main persistence
    await this.mainPersistence.createWorkflowVersion({
      workflowVersionId,
      workflowId: genome.getWorkflowId(),
      commitMessage: genome.getGoal(),
      dsl: genome.getWorkflowConfig(),
      generationId,
      operation: operator,
    })

    return workflowVersionId
  }

  async completeGeneration({
    bestGenome,
    stats,
    operator,
  }: {
    bestGenome: Genome
    stats?: PopulationStats
    operator: WorkflowOperator
  }): Promise<void> {
    if (!this.evolutionPersistence) return

    const activeGenerationId = this.currentGenerationId
    if (!activeGenerationId) {
      lgg.warn("[RunService] No active generation ID for completion")
      return
    }

    const workflowVersionId = await this.ensureWorkflowVersion(bestGenome, activeGenerationId, operator)
    const genomeFeedback = bestGenome.getFeedback()

    await this.evolutionPersistence.completeGeneration(
      {
        generationId: activeGenerationId,
        bestWorkflowVersionId: workflowVersionId,
        comment: stats
          ? `Best: ${stats.bestFitness.toFixed(3)}, Avg: ${stats.avgFitness.toFixed(3)}, Cost: $${stats.evaluationCost.toFixed(2)}`
          : `Best genome: ${bestGenome.getWorkflowVersionId()}`,
        feedback: genomeFeedback ?? undefined,
      },
      stats,
    )

    lgg.log(`[RunService] Completed generation: ${activeGenerationId} with best workflow version: ${workflowVersionId}`)
  }

  async completeRun(status: string, totalCost?: number, bestGenome?: Genome): Promise<void> {
    if (!this.evolutionPersistence) return

    const activeRunId = this.runId
    if (!activeRunId) {
      lgg.warn("[RunService] No active run ID for completion")
      return
    }

    const notes = bestGenome
      ? `Completed with best genome: ${bestGenome.getWorkflowVersionId()}, fitness: ${bestGenome.getFitness()?.score.toFixed(3)}${totalCost ? `, total cost: $${totalCost.toFixed(2)}` : ""}`
      : totalCost
        ? `Total cost: $${totalCost.toFixed(2)}`
        : "Evolution run completed"

    await this.evolutionPersistence.completeRun(activeRunId, status, notes)
    lgg.log(`[RunService] Completed evolution run: ${activeRunId} with status: ${status}`)
  }

  getGenerationId(): string | undefined {
    return this.currentGenerationId
  }

  async getLastCompletedGeneration(runId: string): Promise<EvolutionContext | null> {
    if (!this.evolutionPersistence) return null
    if (!runId) {
      lgg.warn("[RunService] No active run ID available for last completed generation lookup")
      return null
    }
    return this.evolutionPersistence.getLastCompletedGeneration(runId)
  }

  // Helper to check if workflow version exists (for compatibility)
  static async workflowVersionExists(_workflowVersionId: string): Promise<boolean> {
    // This is now a no-op without global persistence
    // Evolution engine should pass persistence through
    return false
  }
}
