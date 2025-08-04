// EvolutionEngine.ts

import { Population } from "@/improvement/gp/Population"
import type { FlowEvolutionMode } from "@/types"
import { isNir } from "@/utils/common/isNir"
import { parallelLimit } from "@/utils/common/parallelLimit"
import { lgg } from "@/utils/logging/Logger"
import type { EvaluationInput } from "@/workflow/ingestion/ingestion.types"
import { Errors, guard } from "@/workflow/schema/errorMessages"
import { CONFIG } from "@/runtime/settings/constants"
import type { EvolutionSettings } from "@/improvement/gp/resources/evolution-types"
import { evolutionSettingsToString } from "@/improvement/gp/resources/evolution-types"
import {
  createDefaultEvolutionSettings,
  createEvolutionSettingsWithConfig,
  validateEvolutionSettings,
} from "@/runtime/settings/evolution"
import { failureTracker } from "@gp/resources/tracker"
import type { EvolutionEvaluator } from "@improvement/evaluators/EvolutionEvaluator"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import { Genome } from "./Genome"
import type {
  GenomeEvaluationResults,
  PopulationStats,
} from "./resources/gp.types"
import { StatsTracker } from "./resources/stats"
import { VerificationCache } from "./resources/wrappers"
import { RunService } from "./RunService"
import { Select } from "./Select"

export class EvolutionEngine {
  private verificationCache: VerificationCache
  private runService: RunService
  private population: Population
  private statsTracker: StatsTracker
  static verbose = CONFIG.logging.override.GP

  constructor(
    private evolutionSettings: EvolutionSettings,
    private evolutionMode: FlowEvolutionMode,
    restartRunId?: string
  ) {
    // Validate configuration early to catch issues before evolution starts
    validateEvolutionSettings(evolutionSettings)

    this.verificationCache = new VerificationCache()
    this.runService = new RunService(
      EvolutionEngine.verbose,
      this.evolutionMode,
      restartRunId
    )
    this.population = new Population(this.evolutionSettings, this.runService)
    this.statsTracker = new StatsTracker(
      this.evolutionSettings,
      this.runService,
      this.population
    )

    lgg.info(evolutionSettingsToString(this.evolutionSettings))
  }

  // needs work: improve comment specificity
  // This is the main function.
  // It handles the evolution process.
  async evolve({
    evaluationInput,
    evaluator,
    _baseWorkflow,
    problemAnalysis,
    continueRunId,
  }: {
    evaluationInput: EvaluationInput
    evaluator: EvolutionEvaluator
    _baseWorkflow: WorkflowConfig | undefined
    problemAnalysis: string
    continueRunId?: string
  }): Promise<{
    bestGenome: Genome
    stats: PopulationStats[]
    totalCost: number
  }> {
    // Create evolution run in database
    await this.runService.createRun(
      evaluationInput.goal,
      this.evolutionSettings,
      continueRunId
    )

    this.statsTracker.logEvolutionStart()

    try {
      // needs work: comments should explain why, not what
      // This is the base case for setting up the population.
      await this.population.initialize(
        evaluationInput,
        _baseWorkflow,
        problemAnalysis
      )

      // We run it one time.
      await this.evaluatePopulation(evaluator)

      // We need to remove the unevaluated genomes from the population.
      await this.population.removeUnevaluated()

      const initialStats = this.statsTracker.recordGenerationStats()

      await this.runService.completeGeneration({
        bestGenome: this.population.getBest(),
        stats: initialStats,
        operator: "mutation",
      })

      for (
        let gen = this.population.getGenerationNumber();
        gen < this.evolutionSettings.generations - 1;
        gen++
      ) {
        if (this.statsTracker.shouldStop()) break

        // Create a new generation.
        // This updates the generation count and handles database insertions.
        await this.runService.createNewGeneration()

        // Sync the population's generation number with the run service
        this.population.incrementGenerationNumber()

        // Here, we create a new generation. It resets the genomes to initial state.
        // It also reselects the genomes that have proven successful in the last generation.
        await Select.createNextGeneration({
          population: this.population,
          config: this.evolutionSettings,
          verificationCache: this.verificationCache,
          evaluationInput,
          _evolutionContext: this.runService.getEvolutionContext(),
          problemAnalysis,
        })

        // Before we run the next generation, we need to reset the genomes.
        // The genomes that were re-selected still have fitness and feedback set, which we do not want.
        this.population.resetGenomes()

        // Run and evaluate the population with the evaluator.
        await this.evaluatePopulation(evaluator)

        // We need to remove the unevaluated genomes from the population.
        await this.population.removeUnevaluated()

        // Log the stats for the just evaluated generation.
        const currentStats = this.statsTracker.recordGenerationStats()

        // Finish the run, and save it in the database.
        await this.runService.completeGeneration({
          bestGenome: this.population.getBest(),
          stats: currentStats,
          operator: "mutation",
        })
      }

      // Find out the best genome.
      const best = this.population.getBest()

      this.statsTracker.logFinalSummary(best)

      // Finish the run, and save it in the database.
      const status = this.statsTracker.getFinalStatus()
      await this.runService.completeRun(
        status,
        this.statsTracker.getTotalCost(),
        best
      )

      return {
        bestGenome: best,
        stats: this.statsTracker.getAllStats(),
        totalCost: this.statsTracker.getTotalCost(),
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined

      lgg.error(`[EvolutionEngine] Evolution failed: ${errorMsg}`)

      if (errorStack) {
        lgg.error(`[EvolutionEngine] Stack trace:`, errorStack)
      }

      lgg.error(
        `[EvolutionEngine] Population state: ${this.population.size()} genomes`
      )
      lgg.error(
        `[EvolutionEngine] Current generation: ${this.population.getGenerationNumber()}`
      )
      lgg.error(`[EvolutionEngine] Run ID: ${this.runService.getRunId()}`)

      if (error instanceof Error && error.cause) {
        lgg.error(`[EvolutionEngine] Error cause:`, error.cause)
      }

      await this.runService.completeRun(
        "failed",
        this.statsTracker.getTotalCost(),
        undefined
      )

      throw error
    }
  }

  /**
   * Evaluate all genomes in population
   */
  private async evaluatePopulation(
    evaluator: EvolutionEvaluator
  ): Promise<{ failedEvaluations: number; successfulEvaluations: number }> {
    const unevaluated = this.population.getUnevaluated()

    if (isNir(unevaluated))
      return { failedEvaluations: 0, successfulEvaluations: 0 }

    let _successfulEvaluations = 0
    let _failedEvaluations = 0

    const results = await parallelLimit(unevaluated, (genome) =>
      this.evaluateGenome(genome, evaluator)
    )

    await Promise.all(
      results.map(async (result, idx) => {
        if (result) {
          const genome = unevaluated[idx]
          if (!result.fitness) {
            lgg.error(
              `[EvolutionEngine] Failed to evaluate genome ${genome.getWorkflowVersionId()}: fitness is null`
            )
            return
          }

          genome.setFitnessAndFeedback({
            fitness: result.fitness,
            feedback: result.feedback,
          })
          this.statsTracker.addCost(result.costOfEvaluation)
          this.statsTracker.incrementEvaluationCount()
          _successfulEvaluations++
        } else {
          const genome = unevaluated[idx]
          lgg.error(
            `[EvolutionEngine] Failed to evaluate genome ${genome.getWorkflowVersionId()}`
          )
          lgg.error(
            `[EvolutionEngine] Genome details: Evaluated: ${genome.isEvaluated}`
          )
          _failedEvaluations++
        }
      })
    )

    return {
      failedEvaluations: _failedEvaluations,
      successfulEvaluations: _successfulEvaluations,
    }
  }

  /**
   * Evaluate single genome
   */
  private async evaluateGenome(
    genome: Genome,
    evaluator: EvolutionEvaluator
  ): Promise<GenomeEvaluationResults | null> {
    const errors: string[] = []
    const maxRetries = 2
    let lastError: string | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const runId = this.runService.getRunId()
        const generation = this.runService.getCurrentGenerationId()
        guard(runId, Errors.noActiveRunId)
        guard(generation, Errors.noCurrentGenerationId)
        const evolutionContext = this.runService.getEvolutionContext()

        lgg.info(
          `[EvolutionEngine] Starting evaluation of genome ${genome.getWorkflowVersionId()} (attempt ${attempt + 1}/${maxRetries + 1})`
        )

        const { data, error, usdCost } = await evaluator.evaluate(
          genome,
          evolutionContext
        )

        if (error || isNir(data)) {
          lastError = error ?? "data is null/undefined"
          lgg.warn(
            `[EvolutionEngine] Evaluation attempt ${attempt + 1} failed for genome ${genome.getWorkflowVersionId()}: ${lastError}`
          )

          if (attempt < maxRetries) {
            // Reset genome state before retry
            lgg.info(
              `[EvolutionEngine] Resetting genome state for retry attempt ${attempt + 2}`
            )
            genome.reset(this.runService.getEvolutionContext())

            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, attempt) * 1000
            lgg.info(`[EvolutionEngine] Retrying in ${delay}ms...`)
            await new Promise((resolve) => setTimeout(resolve, delay))
            continue
          }

          // Final failure after all retries
          lgg.error(
            `[EvolutionEngine] Failed to evaluate genome ${genome.getWorkflowVersionId()} after ${maxRetries + 1} attempts: ${lastError}`
          )
          lgg.error(
            `[EvolutionEngine] Final evaluation result - data: ${data ? "present" : "null/undefined"}, error: ${error ?? "none"}, usdCost: ${usdCost ?? "none"}`
          )
          failureTracker.trackEvaluationFailure()
          return null
        }

        // Success
        if (attempt > 0) {
          lgg.info(
            `[EvolutionEngine] Evaluation succeeded for genome ${genome.getWorkflowVersionId()} on attempt ${attempt + 1}`
          )
        }

        const { fitness, feedback } = data

        return {
          workflowVersionId: genome.getWorkflowVersionId(),
          hasBeenEvaluated: true,
          evaluatedAt: new Date().toISOString(),
          fitness,
          costOfEvaluation: usdCost ?? 0,
          errors,
          feedback,
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        lgg.error(
          `[EvolutionEngine] Exception in evaluation attempt ${attempt + 1} for genome ${genome.getWorkflowVersionId()}: ${lastError}`
        )

        if (attempt < maxRetries) {
          // Reset genome state before retry
          lgg.info(
            `[EvolutionEngine] Resetting genome state for retry after exception (attempt ${attempt + 2})`
          )
          genome.reset(this.runService.getEvolutionContext())

          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempt) * 1000
          lgg.info(
            `[EvolutionEngine] Retrying after exception in ${delay}ms...`
          )
          await new Promise((resolve) => setTimeout(resolve, delay))
          continue
        }

        // Final failure after all retries
        failureTracker.trackEvaluationFailure()
        errors.push(
          `Failed to evaluate genome ${genome.getWorkflowVersionId()}: ${lastError}`
        )
        return null
      }
    }

    // Should never reach here
    return null
  }

  /**
   * Get StatsTracker instance for external access
   */
  getStatsTracker(): StatsTracker {
    return this.statsTracker
  }

  /**
   * Get RunService instance for external access
   */
  getRunService(): RunService {
    return this.runService
  }

  /**
   * Create default configuration for evolution
   */
  static createDefaultConfig(
    overrides?: Partial<EvolutionSettings>
  ): EvolutionSettings {
    return createEvolutionSettingsWithConfig(overrides)
  }
}
