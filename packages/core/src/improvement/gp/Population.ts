// population management for genetic programming evolution
// handles population-level operations, statistics, and diversity metrics

import type { EvolutionContext } from "@improvement/gp/resources/types"
import { isNir } from "@utils/common/isNir"
import { getEvolutionConfig, getLogging } from "@utils/config/runtimeConfig"
import type { FlowEvolutionConfig } from "@utils/config/runtimeConfig.types"
import { lgg } from "@utils/logging/Logger"
import type { RS } from "@utils/types"
import type { EvaluationInput } from "@workflow/ingestion/ingestion.types"
import { guard } from "@workflow/schema/errorMessages"
import { EvolutionUtils } from "@gp/resources/utils"
import type { WorkflowConfig } from "@workflow/schema/workflow.types"
import { Genome } from "./Genome"
import type { PopulationStats } from "./resources/gp.types"
import { RunService } from "./RunService"

export class Population {
  private genomes: Genome[] = []
  private generationNumber = 0
  private runService: RunService
  private evaluationInput: EvaluationInput | null = null
  private problemAnalysis: string = ""
  private _baseWorkflow: WorkflowConfig | undefined = undefined
  static get verbose() {
    return getLogging().GP
  }

  constructor(
    private config: FlowEvolutionConfig,
    runService: RunService
  ) {
    lgg.info(`[Population] Configuration validated successfully:`)
    lgg.info(
      `  Population: ${getEvolutionConfig().GP.populationSize}, Generations: ${getEvolutionConfig().generationAmount}`
    )
    this.runService = runService
  }

  // initialize population with random genomes or from base workflow
  async initialize(
    evaluationInput: EvaluationInput,
    _baseWorkflow: WorkflowConfig | undefined,
    problemAnalysis: string
  ): Promise<void> {
    this.genomes = []

    // Store context for later use in generateRandomGenomes
    this.evaluationInput = evaluationInput
    this._baseWorkflow = _baseWorkflow
    this.problemAnalysis = problemAnalysis

    // needs work: code duplication between random and baseWorkflow cases
    switch (
      getEvolutionConfig().initialPopulationMethod as
        | "random"
        | "baseWorkflow"
        | "prepared"
    ) {
      case "random":
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
      case "baseWorkflow":
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
      case "prepared":
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

  // get all genomes in the current population
  getGenomes(): Genome[] {
    return [...this.genomes]
  }

  // get only the valid genomes from population
  getValidGenomes(): Genome[] {
    if (isNir(this.genomes))
      throw new Error("Population is empty, could not get valid genomes.")

    return this.genomes.filter((genome) => genome.isEvaluated)
  }

  // get current generation number
  getGenerationId(): string {
    return this.runService.getCurrentGenerationId()
  }

  // get current generation number
  getGenerationNumber(): number {
    return this.generationNumber
  }

  // increment generation number
  incrementGenerationNumber(): void {
    this.generationNumber++
  }

  // get total population size
  size(): number {
    return this.genomes.length
  }

  // get the genome with highest fitness
  getBest(): Genome {
    guard(this.genomes, "Population is empty")

    const validGenomes = this.getValidGenomes()

    return validGenomes.reduce(
      (best, current) =>
        current.getFitnessScore() > best.getFitnessScore() ? current : best,
      validGenomes[0]
    )
  }

  // needs work: should use getValidGenomes() like getBest() for consistency
  // get the genome with lowest fitness
  getWorst(): Genome {
    guard(this.genomes, "Population is empty")

    return this.genomes.reduce((worst, current) =>
      current.getFitnessScore() < worst.getFitnessScore() ? current : worst
    )
  }

  // get top n genomes sorted by fitness
  getTop(n: number): Genome[] {
    return [...this.genomes]
      .sort((a, b) => b.getFitnessScore() - a.getFitnessScore())
      .slice(0, n)
  }

  // reset all the genomes
  resetGenomes(): void {
    if (isNir(this.genomes))
      throw new Error("Population is empty, could not reset.")

    for (const genome of this.genomes)
      genome.reset(this.runService.getEvolutionContext())
  }

  /**
   * Remove genomes that are not evaluated (likely a failed evaluation).
   */
  async removeUnevaluated(): Promise<void> {
    if (isNir(this.genomes))
      throw new Error(
        "Population is empty, could not remove unevaluated genomes."
      )

    const countBefore = this.genomes?.length ?? 0

    // Log details about each genome before filtering
    lgg.info(`[Population] Before filtering - Total genomes: ${countBefore}`)
    this.genomes?.forEach((genome, index) => {
      try {
        const fitness = genome.getFitness()
        lgg.info(
          `[Population] Genome ${index}: ${genome.getWorkflowVersionId()} - Evaluated: ${genome.isEvaluated} - Fitness: ${fitness?.score ?? "null"}`
        )
      } catch (error) {
        lgg.info(
          `[Population] Genome ${index}: ${genome.getWorkflowVersionId()} - Evaluated: ${genome.isEvaluated} - Fitness: not available`
        )
      }
    })

    this.genomes = this.genomes?.filter((genome) => genome.isEvaluated) ?? []
    const countAfter = this.genomes?.length ?? 0

    // Dynamic Population Replenishment
    const minViablePopulation = 4
    if (this.genomes.length < minViablePopulation) {
      const needed = minViablePopulation - this.genomes.length
      lgg.info(
        `[Population] Population below minimum viable size (${this.genomes.length}/${minViablePopulation}). Generating ${needed} new random genomes.`
      )

      const newGenomes = await this.generateRandomGenomes(needed)
      this.genomes.push(...newGenomes)

      lgg.info(
        `[Population] Added ${newGenomes.length} new genomes. Population size: ${this.genomes.length}`
      )
    }

    if (isNir(this.genomes))
      throw new Error(
        `After removing unevaluated genomes, population is empty. ${countBefore} -> ${countAfter}. Consider increasing population size or adding retry logic.`
      )

    if (this.genomes.length < 2) {
      throw new Error(
        `Population too small for evolution after filtering: ${this.genomes.length} genomes remaining (need at least 2 for crossover). Started with ${countBefore} genomes.`
      )
    }

    lgg.info(
      `[Population] Removed ${countBefore - countAfter} unevaluated genomes.`
    )
  }

  /**
   * Get genomes that have not been successfully evaluated (valid: false).
   * This includes both genomes that have never been evaluated and those that failed evaluation.
   */
  getUnevaluated(): Genome[] {
    const unevaluated: Genome[] = []
    if (isNir(this.genomes))
      throw new Error("Population is empty, could not get unevaluated genomes.")

    for (const genome of this.genomes)
      if (!genome.isEvaluated) unevaluated.push(genome)

    return unevaluated
  }

  getEvaluated(): Genome[] {
    const evaluated: Genome[] = []
    if (isNir(this.genomes))
      throw new Error("Population is empty, could not get evaluated genomes.")

    for (const genome of this.genomes)
      if (genome.isEvaluated) evaluated.push(genome)

    return evaluated
  }

  // calculate population statistics
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

  // find genomes that are similar to target within threshold
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
        group.sort(
          (a, b) => (b.getFitness()?.score ?? 0) - (a.getFitness()?.score ?? 0)
        )

        // Mark all but the best for removal
        for (let j = 1; j < group.length; j++) {
          toRemove.add(group[j].getWorkflowVersionId())
        }
      }
    }

    // Remove marked genomes
    this.genomes = this.genomes.filter(
      (g) => !toRemove.has(g.getWorkflowVersionId())
    )
  }

  // add a new genome to the population
  addGenome(genome: Genome): void {
    this.genomes.push(genome)
  }

  // remove a genome from the population by id
  removeGenome(genomeId: string): boolean {
    const originalLength = this.genomes.length
    this.genomes = this.genomes.filter(
      (g) => g.getWorkflowVersionId() !== genomeId
    )
    return this.genomes.length < originalLength
  }

  // clear all genomes and reset generation counter
  clear(): void {
    this.genomes = []
    this.generationNumber = 0
  }

  /**
   * Generate random genomes for population replenishment.
   * Uses the same logic as initial population generation.
   */
  async generateRandomGenomes(count: number): Promise<Genome[]> {
    if (count <= 0) return []

    if (!this.evaluationInput) {
      lgg.error("Cannot generate random genomes: evaluationInput is null")
      return []
    }

    const genomePromises: Promise<RS<Genome>>[] = []
    const evolutionContext = this.runService.getEvolutionContext()

    for (let i = 0; i < count; i++) {
      try {
        const genomePromise =
          getEvolutionConfig().initialPopulationMethod === "prepared"
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
          `Failed to create ${getEvolutionConfig().initialPopulationMethod === "prepared" ? "prepared" : "random"} genome for replenishment`,
          e
        )
      }
    }

    const results = await Promise.all(genomePromises)
    const genomes = results
      .filter((result) => result.success)
      .map((result) => result.data)

    const failures = results.filter((result) => !result.success)
    if (failures.length > 0) {
      lgg.warn(
        `Failed to create ${failures.length} random genomes for replenishment:`,
        failures.map((f) => f.error)
      )
    }

    return genomes
  }

  async initializePopulationHelper({
    config,
    evaluationInput,
    runId,
    _baseWorkflow,
    _evolutionContext,
    problemAnalysis,
  }: {
    config: FlowEvolutionConfig
    evaluationInput: EvaluationInput
    runId: string
    _baseWorkflow: WorkflowConfig | undefined
    _evolutionContext: Omit<EvolutionContext, "generationNumber">
    problemAnalysis: string
  }): Promise<Population> {
    const genomePromises: Promise<RS<Genome>>[] = []

    for (let i = 0; i < getEvolutionConfig().GP.populationSize; i++) {
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

    const genomes = results
      .filter((result) => result.success)
      .map((result) => result.data)

    const failures = results.filter((result) => !result.success)

    population.setPopulation(genomes)

    lgg.info(
      `Population initialized: ${genomes.length}/${getEvolutionConfig().GP.populationSize} genomes created successfully`
    )

    if (failures.length > 0) {
      lgg.warn(
        `Failed to create ${failures.length} genomes:`,
        failures.map((f) => f.error)
      )

      // needs work: hardcoded threshold 0.5 should be configurable
      if (genomes.length < getEvolutionConfig().GP.populationSize * 0.5) {
        lgg.error(
          `Critical: Only ${genomes.length} out of ${getEvolutionConfig().GP.populationSize} genomes created successfully`
        )
      }
    }
    return population
  }

  async initializePreparedPopulation({
    config,
    evaluationInput,
    runId,
    _baseWorkflow,
    _evolutionContext,
    problemAnalysis,
  }: {
    config: FlowEvolutionConfig
    evaluationInput: EvaluationInput
    runId: string
    _baseWorkflow: WorkflowConfig | undefined
    _evolutionContext: Omit<EvolutionContext, "generationNumber">
    problemAnalysis: string
  }): Promise<Population> {
    const genomePromises: Promise<RS<Genome>>[] = []

    for (let i = 0; i < getEvolutionConfig().GP.populationSize; i++) {
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

    const genomes = results
      .filter((result) => result.success)
      .map((result) => result.data)

    const failures = results.filter((result) => !result.success)

    population.setPopulation(genomes)

    lgg.info(
      `Prepared population initialized: ${genomes.length}/${getEvolutionConfig().GP.populationSize} genomes created successfully`
    )

    if (failures.length > 0) {
      lgg.warn(
        `Failed to create ${failures.length} prepared genomes:`,
        failures.map((f) => f.error)
      )

      if (genomes.length < getEvolutionConfig().GP.populationSize * 0.5) {
        lgg.error(
          `Critical: Only ${genomes.length} out of ${getEvolutionConfig().GP.populationSize} prepared genomes created successfully`
        )
      }
    }
    return population
  }
}
