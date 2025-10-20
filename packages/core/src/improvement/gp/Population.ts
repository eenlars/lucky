/**
 * Population - Manages collections of genomes for genetic programming evolution
 *
 * This class handles all population-level operations including:
 * - Population initialization (random, baseWorkflow, prepared methods)
 * - Genome lifecycle management (evaluation, removal, replacement)
 * - Population statistics and diversity metrics calculation
 * - Dynamic population replenishment to maintain minimum viable size
 *
 * Key features:
 * - Multiple initialization strategies based on CONFIG settings
 * - Automatic removal of unevaluated/failed genomes with replenishment
 * - Population statistics tracking (best/worst fitness, diversity measures)
 * - Memory-efficient operations through generator functions and filtering
 *
 * Population lifecycle:
 * 1. Initialize with random/prepared/baseWorkflow genomes
 * 2. Evaluate genomes through external evaluator
 * 3. Remove failed evaluations, replenish if below threshold
 * 4. Calculate generation statistics and select for breeding
 * 5. Create next generation through selection, crossover, mutation
 *
 * @see Genome - Individual workflow genomes managed by this population
 * @see EvolutionEngine - Orchestrates population evolution across generations
 */

import { getCoreConfig, isLoggingEnabled } from "@core/core-config/coreConfig"
import type { EvolutionSettings } from "@core/improvement/gp/resources/evolution-types"
import type { EvolutionContext } from "@core/improvement/gp/resources/gp.types"
import { EvolutionUtils } from "@core/improvement/gp/resources/utils"
import { PopulationError } from "@core/utils/errors/evolution-errors"
import { lgg } from "@core/utils/logging/Logger"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import { guard } from "@core/workflow/schema/errorMessages"
import type { WorkflowConfig } from "@core/workflow/schema/workflow.types"
import type { RS } from "@lucky/shared"
import { isNir } from "@lucky/shared"
import { Genome } from "./Genome"
import type { RunService } from "./RunService"
import type { PopulationStats } from "./resources/gp.types"

export class Population {
  private genomes: Genome[] = []
  private generationNumber = 0
  private runService: RunService
  private evaluationInput: EvaluationInput | null = null
  private problemAnalysis = ""
  private _baseWorkflow: WorkflowConfig | undefined = undefined
  static verbose = isLoggingEnabled("GP")

  constructor(
    private config: EvolutionSettings,
    runService: RunService,
  ) {
    lgg.info("[Population] Configuration validated successfully:")
    lgg.info(`Population: ${config.populationSize}, Generations: ${config.generations}`)
    this.runService = runService
  }

  // initialize population with random genomes or from base workflow
  async initialize(
    evaluationInput: EvaluationInput,
    _baseWorkflow: WorkflowConfig | undefined,
    problemAnalysis: string,
  ): Promise<void> {
    this.genomes = []

    // Store context for later use in generateRandomGenomes
    this.evaluationInput = evaluationInput
    this._baseWorkflow = _baseWorkflow
    this.problemAnalysis = problemAnalysis

    // TODO: refactor to eliminate code duplication between initialization methods
    // TODO: consider using factory pattern for population initialization strategies
    const initialPopulationMethod = getCoreConfig().evolution.GP.initialPopulationMethod
    switch (initialPopulationMethod as "random" | "baseWorkflow" | "prepared") {
      case "random": {
        const population1 = await this.initializePopulationHelper({
          config: this.config,
          evaluationInput,
          runId: this.runService.getRunId(),
          _evolutionContext: {
            runId: this.runService.getRunId(),
            generationId: this.runService.getCurrentGenerationId(),
          },
          _baseWorkflow: _baseWorkflow,
          problemAnalysis,
        })
        this.genomes = population1.getGenomes()
        break
      }
      case "baseWorkflow": {
        const population2 = await this.initializePopulationHelper({
          config: this.config,
          evaluationInput,
          runId: this.runService.getRunId(),
          _evolutionContext: {
            runId: this.runService.getRunId(),
            generationId: this.runService.getCurrentGenerationId(),
          },
          _baseWorkflow: _baseWorkflow,
          problemAnalysis,
        })
        this.genomes = population2.getGenomes()
        break
      }
      case "prepared": {
        const population3 = await this.initializePreparedPopulation({
          config: this.config,
          evaluationInput,
          runId: this.runService.getRunId(),
          _evolutionContext: {
            runId: this.runService.getRunId(),
            generationId: this.runService.getCurrentGenerationId(),
          },
          _baseWorkflow: _baseWorkflow,
          problemAnalysis,
        })
        this.genomes = population3.getGenomes()
        break
      }
    }
  }

  /**
   * Gets the run service managing evolution run state.
   *
   * @returns The run service instance
   */
  getRunService(): RunService {
    return this.runService
  }

  /**
   * Replace the current population with a new set of genomes.
   *
   * If an `evolutionContext` is supplied we are starting a brand-new generation
   * and therefore **must** reset every genome (this flags them as unevaluated
   * and updates their internal context).
   *
   * When **no** context is supplied – for example when we are merely pruning
   * invalid genomes inside a generation – we keep the existing fitness data
   * intact and skip the `reset` step. This prevents the unwanted side-effect
   * of marking every genome as invalid, which previously caused the engine to
   * think there were no valid individuals to breed and halted evolution.
   */
  setPopulation(genomes: Genome[]): void {
    this.genomes = genomes
  }

  /**
   * Gets all genomes in the current population.
   *
   * @returns A copy of the genome array
   */
  getGenomes(): Genome[] {
    return [...this.genomes]
  }

  /**
   * Gets only the successfully evaluated genomes from the population.
   *
   * @returns Array of genomes that have been evaluated
   * @throws Error if population is empty
   */
  getValidGenomes(): Genome[] {
    if (isNir(this.genomes))
      throw new PopulationError("Cannot get valid genomes from an empty population.", {
        operation: "getValidGenomes",
        suggestion: "Initialize the population before accessing genomes.",
      })

    return this.genomes.filter(genome => genome.isEvaluated)
  }

  /**
   * Gets the current generation ID from the run service.
   *
   * @returns The generation ID string
   */
  getGenerationId(): string {
    return this.runService.getCurrentGenerationId()
  }

  /**
   * Gets the current generation number.
   *
   * @returns The generation number (0-indexed)
   */
  getGenerationNumber(): number {
    return this.generationNumber
  }

  /**
   * Increments the generation number for the next evolution cycle.
   */
  incrementGenerationNumber(): void {
    this.generationNumber++
  }

  /**
   * Gets the total population size.
   *
   * @returns The number of genomes in the population
   */
  size(): number {
    return this.genomes.length
  }

  /**
   * Gets the genome with the highest fitness score.
   *
   * @returns The best performing genome
   * @throws Error if population is empty
   *
   * @remarks
   * Only considers evaluated genomes
   */
  getBest(): Genome {
    guard(this.genomes, "Population is empty")

    const validGenomes = this.getValidGenomes()

    return validGenomes.reduce(
      (best, current) => (current.getFitnessScore() > best.getFitnessScore() ? current : best),
      validGenomes[0],
    )
  }

  /**
   * Gets the genome with the lowest fitness score.
   *
   * @returns The worst performing genome
   * @throws Error if population is empty
   *
   * TODO: refactor to use getValidGenomes() like getBest() for consistency
   * TODO: add validation that population contains evaluated genomes
   */
  getWorst(): Genome {
    guard(this.genomes, "Population is empty")

    return this.genomes.reduce((worst, current) =>
      current.getFitnessScore() < worst.getFitnessScore() ? current : worst,
    )
  }

  /**
   * Gets the top N genomes sorted by fitness score (descending).
   *
   * @param n - Number of top genomes to return
   * @returns Array of top performing genomes
   */
  getTop(n: number): Genome[] {
    return [...this.genomes].sort((a, b) => b.getFitnessScore() - a.getFitnessScore()).slice(0, n)
  }

  /**
   * Resets all genomes for a new generation.
   *
   * @throws Error if population is empty
   *
   * @remarks
   * Marks all genomes as unevaluated and clears their fitness data
   */
  resetGenomes(): void {
    if (isNir(this.genomes))
      throw new PopulationError("Cannot reset an empty population.", {
        operation: "resetGenomes",
        suggestion: "Initialize the population before resetting.",
      })

    for (const genome of this.genomes) genome.reset(this.runService.getEvolutionContext())
  }

  /**
   * Remove genomes that are not evaluated (likely a failed evaluation).
   */
  async removeUnevaluated(): Promise<void> {
    if (isNir(this.genomes))
      throw new PopulationError("Cannot remove unevaluated genomes from an empty population.", {
        operation: "removeUnevaluated",
        suggestion: "Initialize the population before filtering genomes.",
      })

    const countBefore = this.genomes?.length ?? 0

    // Log details about each genome before filtering
    lgg.info(`[Population] Before filtering - Total genomes: ${countBefore}`)
    this.genomes?.forEach((genome, index) => {
      try {
        const fitness = genome.getFitness()
        lgg.info(
          `[Population] Genome ${index}: ${genome.getWorkflowVersionId()} - Evaluated: ${genome.isEvaluated} - Fitness: ${fitness?.score ?? "null"}`,
        )
      } catch (_error) {
        lgg.info(
          `[Population] Genome ${index}: ${genome.getWorkflowVersionId()} - Evaluated: ${genome.isEvaluated} - Fitness: not available`,
        )
      }
    })

    this.genomes = this.genomes?.filter(genome => genome.isEvaluated) ?? []
    const countAfter = this.genomes?.length ?? 0

    // dynamic population replenishment to maintain genetic diversity
    // minimum of 4 genomes needed for meaningful crossover operations
    const minViablePopulation = 4
    if (this.genomes.length < minViablePopulation) {
      const needed = minViablePopulation - this.genomes.length
      lgg.info(
        `[Population] Population below minimum viable size (${this.genomes.length}/${minViablePopulation}). Generating ${needed} new random genomes.`,
      )

      // generate new random genomes to replenish population
      const newGenomes = await this.generateRandomGenomes(needed)
      this.genomes.push(...newGenomes)

      lgg.info(`[Population] Added ${newGenomes.length} new genomes. Population size: ${this.genomes.length}`)
    }

    if (isNir(this.genomes))
      throw new PopulationError("Population became empty after removing unevaluated genomes.", {
        currentSize: 0,
        operation: "removeUnevaluated",
        suggestion: `Started with ${countBefore} genomes but all failed evaluation. Increase population size or check evaluation logic.`,
      })

    if (this.genomes.length < 2) {
      throw new PopulationError("Population too small for genetic operations after filtering.", {
        currentSize: this.genomes.length,
        requiredSize: 2,
        operation: "removeUnevaluated",
        suggestion: `Started with ${countBefore} genomes, ${countAfter} remain. Need at least 2 for crossover. Increase population size or adjust filtering criteria.`,
      })
    }

    lgg.info(`[Population] Removed ${countBefore - countAfter} unevaluated genomes.`)
  }

  /**
   * Get genomes that have not been successfully evaluated (valid: false).
   * This includes both genomes that have never been evaluated and those that failed evaluation.
   */
  getUnevaluated(): Genome[] {
    const unevaluated: Genome[] = []
    if (isNir(this.genomes))
      throw new PopulationError("Cannot get unevaluated genomes from an empty population.", {
        operation: "getUnevaluated",
        suggestion: "Initialize the population before accessing genomes.",
      })

    for (const genome of this.genomes) if (!genome.isEvaluated) unevaluated.push(genome)

    return unevaluated
  }

  /**
   * Gets all genomes that have been successfully evaluated.
   *
   * @returns Array of evaluated genomes
   * @throws Error if population is empty
   */
  getEvaluated(): Genome[] {
    const evaluated: Genome[] = []
    if (isNir(this.genomes))
      throw new PopulationError("Cannot get evaluated genomes from an empty population.", {
        operation: "getEvaluated",
        suggestion: "Initialize the population before accessing genomes.",
      })

    for (const genome of this.genomes) if (genome.isEvaluated) evaluated.push(genome)

    return evaluated
  }

  /**
   * Calculates comprehensive population statistics.
   *
   * @param additionalMetrics - Optional metrics to include in stats
   * @returns Population statistics including fitness metrics and diversity
   * @throws Error if population is empty
   */
  getStats(additionalMetrics?: {
    evaluationCost?: number
    evaluationsPerHour?: number
    improvementRate?: number
  }): PopulationStats {
    guard(this.genomes, "Population is empty")

    const stats = EvolutionUtils.calculateStats(this.genomes)

    return {
      generation: this.generationNumber,
      bestFitness: stats.bestFitness,
      worstFitness: stats.worstFitness,
      avgFitness: stats.avgFitness,
      fitnessStdDev: stats.stdDev,
      evaluationCost: additionalMetrics?.evaluationCost ?? 0,
      evaluationsPerHour: additionalMetrics?.evaluationsPerHour ?? 0,
      improvementRate: additionalMetrics?.improvementRate ?? 0,
    }
  }

  /**
   * Finds genomes that are structurally similar to the target.
   *
   * @param target - The genome to compare against
   * @param threshold - Similarity threshold (0=identical, higher=less similar)
   * @returns Array of similar genomes
   */
  findSimilarGenomes(target: Genome, threshold: number): Genome[] {
    return EvolutionUtils.findSimilarGenomes(this.genomes, target, threshold)
  }

  /**
   * Remove genomes that are too similar to maintain diversity.
   *
   * @param threshold Similarity threshold (0 = identical, 1+ = very different). Only genomes with a structural fingerprint distance <= threshold are considered similar. Typical range: 0 (identical) to 1 (loosely similar). Lower values prune more aggressively.
   */
  pruneSimilar(threshold: number): void {
    const toRemove: Set<string> = new Set()

    for (let i = 0; i < this.genomes.length; i++) {
      if (toRemove.has(this.genomes[i].getWorkflowVersionId())) continue

      const similar = this.findSimilarGenomes(this.genomes[i], threshold)

      // Keep the best of similar genomes, remove others
      if (similar.length > 0) {
        const group = [this.genomes[i], ...similar]
        group.sort((a, b) => (b.getFitness()?.score ?? 0) - (a.getFitness()?.score ?? 0))

        // Mark all but the best for removal
        for (let j = 1; j < group.length; j++) {
          toRemove.add(group[j].getWorkflowVersionId())
        }
      }
    }

    // Remove marked genomes
    this.genomes = this.genomes.filter(g => !toRemove.has(g.getWorkflowVersionId()))
  }

  /**
   * Adds a new genome to the population.
   *
   * @param genome - The genome to add
   */
  addGenome(genome: Genome): void {
    this.genomes.push(genome)
  }

  /**
   * Removes a genome from the population by ID.
   *
   * @param genomeId - The workflow version ID of the genome to remove
   * @returns True if a genome was removed, false otherwise
   */
  removeGenome(genomeId: string): boolean {
    const originalLength = this.genomes.length
    this.genomes = this.genomes.filter(g => g.getWorkflowVersionId() !== genomeId)
    return this.genomes.length < originalLength
  }

  /**
   * Clears all genomes and resets the generation counter.
   */
  clear(): void {
    this.genomes = []
    this.generationNumber = 0
  }

  /**
   * Generates random genomes for population replenishment.
   *
   * @param count - Number of genomes to generate
   * @returns Array of newly generated genomes
   * @throws Error if required context is not available
   *
   * @remarks
   * Uses the same logic as initial population generation.
   * Requires evaluationInput, problemAnalysis to be set from initialization.
   */
  async generateRandomGenomes(count: number): Promise<Genome[]> {
    if (count <= 0) return []

    if (!this.evaluationInput) {
      lgg.error("Cannot generate random genomes: evaluationInput is null")
      return []
    }

    const initialPopulationMethod = getCoreConfig().evolution.GP.initialPopulationMethod
    const genomePromises: Promise<RS<Genome>>[] = []
    const evolutionContext = this.runService.getEvolutionContext()

    for (let i = 0; i < count; i++) {
      try {
        const genomePromise =
          initialPopulationMethod === "prepared"
            ? Genome.createPrepared({
                evaluationInput: this.evaluationInput,
                baseWorkflow: this._baseWorkflow,
                parentWorkflowVersionIds: [],
                _evolutionContext: evolutionContext,
                problemAnalysis: this.problemAnalysis,
              })
            : Genome.createRandom({
                evaluationInput: this.evaluationInput,
                baseWorkflow: this._baseWorkflow,
                parentWorkflowVersionIds: [],
                _evolutionContext: evolutionContext,
                problemAnalysis: this.problemAnalysis,
                evolutionMode: this.runService.getEvolutionMode(),
              })
        genomePromises.push(genomePromise)
      } catch (e) {
        lgg.error(
          `Failed to create ${initialPopulationMethod === "prepared" ? "prepared" : "random"} genome for replenishment`,
          e,
        )
      }
    }

    const results = await Promise.all(genomePromises)
    const genomes = results.filter(result => result.success).map(result => result.data)

    const failures = results.filter(result => !result.success)
    if (failures.length > 0) {
      lgg.warn(
        `Failed to create ${failures.length} random genomes for replenishment:`,
        failures.map(f => f.error),
      )
    }

    return genomes
  }

  /**
   * Helper method to initialize population with random or base workflow genomes.
   *
   * @private
   */
  async initializePopulationHelper({
    config,
    evaluationInput,
    runId,
    _baseWorkflow,
    _evolutionContext,
    problemAnalysis,
  }: {
    config: EvolutionSettings
    evaluationInput: EvaluationInput
    runId: string
    _baseWorkflow: WorkflowConfig | undefined
    _evolutionContext: Omit<EvolutionContext, "generationNumber">
    problemAnalysis: string
  }): Promise<Population> {
    const genomePromises: Promise<RS<Genome>>[] = []

    for (let i = 0; i < config.populationSize; i++) {
      try {
        const genomePromise = Genome.createRandom({
          evaluationInput,
          baseWorkflow: _baseWorkflow,
          parentWorkflowVersionIds: [],
          _evolutionContext: {
            runId,
            generationId: _evolutionContext.generationId,
            generationNumber: 0,
          },
          problemAnalysis,
          evolutionMode: this.runService.getEvolutionMode(),
        })
        genomePromises.push(genomePromise)
      } catch (e) {
        lgg.error("Failed to create genome", e)
      }
    }
    const population = new Population(config, this.runService)
    const results = await Promise.all(genomePromises)

    const genomes = results.filter(result => result.success).map(result => result.data)

    const failures = results.filter(result => !result.success)

    population.setPopulation(genomes)

    lgg.info(`Population initialized: ${genomes.length}/${config.populationSize} genomes created successfully`)

    if (failures.length > 0) {
      lgg.warn(
        `Failed to create ${failures.length} genomes:`,
        failures.map(f => f.error),
      )

      // TODO: make minimum viable population threshold configurable
      // TODO: add recovery strategies for extreme population loss scenarios
      if (genomes.length < config.populationSize * 0.5) {
        lgg.error(`Critical: Only ${genomes.length} out of ${config.populationSize} genomes created successfully`)
      }
    }
    return population
  }

  /**
   * Initializes population with prepared genomes using deep problem analysis.
   *
   * @private
   */
  async initializePreparedPopulation({
    config,
    evaluationInput,
    runId,
    _baseWorkflow,
    _evolutionContext,
    problemAnalysis,
  }: {
    config: EvolutionSettings
    evaluationInput: EvaluationInput
    runId: string
    _baseWorkflow: WorkflowConfig | undefined
    _evolutionContext: Omit<EvolutionContext, "generationNumber">
    problemAnalysis: string
  }): Promise<Population> {
    const genomePromises: Promise<RS<Genome>>[] = []

    for (let i = 0; i < config.populationSize; i++) {
      try {
        const genomePromise = Genome.createPrepared({
          evaluationInput,
          baseWorkflow: _baseWorkflow,
          parentWorkflowVersionIds: [],
          _evolutionContext: {
            runId,
            generationId: _evolutionContext.generationId,
            generationNumber: 0,
          },
          problemAnalysis,
        })
        genomePromises.push(genomePromise)
      } catch (e) {
        lgg.error("Failed to create prepared genome", e)
      }
    }
    const population = new Population(config, this.runService)
    const results = await Promise.all(genomePromises)

    const genomes = results.filter(result => result.success).map(result => result.data)

    const failures = results.filter(result => !result.success)

    population.setPopulation(genomes)

    lgg.info(`Prepared population initialized: ${genomes.length}/${config.populationSize} genomes created successfully`)

    if (failures.length > 0) {
      lgg.warn(
        `Failed to create ${failures.length} prepared genomes:`,
        failures.map(f => f.error),
      )

      if (genomes.length < config.populationSize * 0.5) {
        lgg.error(
          `Critical: Only ${genomes.length} out of ${config.populationSize} prepared genomes created successfully`,
        )
      }
    }
    return population
  }
}
