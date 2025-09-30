/**
 * Select - Genetic selection mechanisms for workflow evolution
 *
 * This class implements various selection strategies for choosing parent genomes
 * for the next generation and orchestrating the creation of offspring:
 *
 * Selection strategies:
 * - Tournament selection with configurable tournament size
 * - Elite selection to preserve top-performing genomes
 * - Random selection for genetic diversity maintenance
 *
 * Key features:
 * - Fitness-based parent selection with diversity pressure
 * - Next generation creation through selection, crossover, and mutation
 * - Robust error handling for population edge cases
 * - Integration with crossover and mutation operators
 * - Validation of population fitness before selection operations
 *
 * Selection pipeline:
 * 1. Filter valid genomes with positive fitness scores
 * 2. Apply elite selection to preserve best performers
 * 3. Use tournament selection for remaining parent slots
 * 4. Create offspring through crossover and mutation
 * 5. Replace population with new generation
 *
 * TODO: implement diversity-aware selection to prevent premature convergence
 * TODO: add adaptive selection pressure based on population fitness distribution
 * TODO: implement multi-objective selection for complex fitness landscapes
 */

import { Genome } from "@core/improvement/gp/Genome"
import { Mutations } from "@core/improvement/gp/operators/Mutations"
import { createDummyGenome, createDummySurvivors } from "@core/improvement/gp/resources/debug/dummyGenome"
import type { EvolutionSettings } from "@core/improvement/gp/resources/evolution-types"
import { failureTracker } from "@core/improvement/gp/resources/tracker"
import type { EvolutionContext } from "@core/improvement/gp/resources/types"
import type { VerificationCache } from "@core/improvement/gp/resources/wrappers"
import { isNir } from "@core/utils/common/isNir"
import { truncater } from "@core/utils/common/llmify"
import { parallelLimit } from "@core/utils/common/parallelLimit"
import { lgg } from "@core/utils/logging/Logger"
import type { EvaluationInput } from "@core/workflow/ingestion/ingestion.types"
import { CONFIG } from "@core/core-config/compat"
import { Crossover } from "./operators/crossover/Crossover"
import type { MutationOptions } from "./operators/mutations/mutation.types"
import { Population } from "./Population"

export class Select {
  private static verbose = CONFIG.logging.override.GP

  /**
   * Select random parents for breeding from valid genomes
   */
  static selectRandomParents(population: Population, amount: number): Genome[] {
    const validGenomes = population.getGenomes().filter((genome) => genome.getFitnessScore() > 0)

    if (isNir(validGenomes)) throw new Error("No valid genomes in population to select from")

    if (amount > validGenomes.length) {
      // TODO: implement smart parent reuse strategies for small populations
      throw new Error(
        `Cannot select ${amount} parents from ${validGenomes.length} valid genomes. ` +
          `Population has only ${validGenomes.length} valid genomes, but requires at least ${amount}.`
      )
    }

    const list = [...validGenomes].sort(() => Math.random() - 0.5).slice(0, amount)
    return list
  }

  /**
   * Select parents for next generation using tournament selection
   */
  static async selectParents({
    population,
    config,
  }: {
    population: Population
    config: EvolutionSettings
  }): Promise<Genome[]> {
    if (CONFIG.evolution.GP.verbose) {
      lgg.log("[Select] Verbose mode: skipping parent selection for selectParents")
      return [
        createDummyGenome([], {
          runId: "test-run-id",
          generationId: "test-generation-id",
          generationNumber: 0,
        }),
      ]
    }

    const parents: Genome[] = []
    const numParents = Math.floor(config.populationSize / 2)

    // Filter out invalid genomes
    const validPopulation = population.getGenomes().filter((genome) => genome.isEvaluated)

    if (validPopulation.length === 0) {
      lgg.error("[Select] No valid genomes with fitness scores found in population")
      // TODO: implement population recovery strategies for total evaluation failure
      throw new Error("No valid genomes with fitness scores found in population")
    }

    // Elite selection - always keep the best
    const sortedByFitness = [...validPopulation].sort((a, b) => b.getFitnessScore() - a.getFitnessScore())
    const elite = sortedByFitness.slice(0, config.eliteSize)
    parents.push(...elite)

    // Tournament selection for the rest
    while (parents.length < numParents) {
      const parent = this.tournamentSelect(validPopulation, config.tournamentSize, parents)
      parents.push(parent)
    }

    return parents
  }

  /**
   * Tournament selection with optional diversity pressure
   */
  private static tournamentSelect(
    population: ReadonlyArray<Genome>,
    tournamentSize: number,
    alreadySelected: ReadonlyArray<Genome>
  ): Genome {
    // Random tournament
    const tournament: Genome[] = []
    for (let i = 0; i < tournamentSize; i++) {
      const idx = Math.floor(Math.random() * population.length)
      const candidate = population[idx]
      if (candidate && typeof candidate.getFitnessScore() === "number") {
        tournament.push(candidate)
      }
    }

    if (isNir(tournament)) {
      lgg.error("[Select] No valid candidates found in tournament")
      throw new Error("No valid candidates found in tournament")
    }

    // Standard fitness-based selection
    const winner = tournament.reduce((best, current) =>
      current.getFitnessScore() > best.getFitnessScore() ? current : best
    )

    return winner
  }

  /**
   * Public tournament selection method for tests
   */
  static async tournamentSelection(
    population: ReadonlyArray<Genome>,
    tournamentSize: number
  ): Promise<Genome | undefined> {
    if (population.length === 0) {
      return undefined
    }

    return this.tournamentSelect(population, tournamentSize, [])
  }

  /**
   * Select survivors from parents and offspring
   */
  static async selectSurvivors({
    parents,
    offspring,
    config,
  }: {
    parents: Genome[]
    offspring: Genome[]
    config: EvolutionSettings
  }): Promise<Genome[]> {
    if (CONFIG.evolution.GP.verbose) return createDummySurvivors(parents, offspring)

    if (parents.length === 0 && offspring.length === 0) return []

    // Combine parents and offspring
    const combined = [...parents, ...offspring]

    // Sort by fitness (prioritize valid genomes)
    combined.sort((a, b) => {
      // Valid genomes come first
      if (a.isEvaluated && !b.isEvaluated) return -1
      if (!a.isEvaluated && b.isEvaluated) return 1

      // Then by score
      return b.getFitnessScore() - a.getFitnessScore()
    })

    // Take the top N based on population size
    return combined.slice(0, config.populationSize)
  }

  /**
   * Generate offspring through crossover and mutation operations
   */
  private static async generateOffspring({
    population,
    config,
    nextGen,
    verbose = false,
    evaluationInput,
    _evolutionContext,
    problemAnalysis,
  }: {
    population: Population
    config: EvolutionSettings
    nextGen: number
    verbose?: boolean
    evaluationInput: EvaluationInput
    _evolutionContext: EvolutionContext
    problemAnalysis: string
  }): Promise<{
    offspring: Genome[]
    attempts: number
  }> {
    const offspring: Genome[] = []
    let attempts = 0

    // --- Hard cap for maxAttempts ---
    const maxAttempts = Math.min(Math.max(50, config.offspringCount * 20), 1000) // hard cap at 1000

    while (offspring.length < config.offspringCount && attempts < maxAttempts) {
      const remaining = config.offspringCount - offspring.length
      const currentBatchSize = Math.min(remaining, maxAttempts - attempts)

      const offspringTasks: (() => Promise<Genome[]>)[] = Array.from({ length: currentBatchSize }, () => async () => {
        const random = Math.random()
        const useCrossover = random < config.crossoverRate
        const requiredParents = useCrossover ? config.numberOfParentsCreatingOffspring : 1
        const parents: Genome[] = Select.selectRandomParents(population, requiredParents)
        let children: Genome[] = []

        try {
          // Genetic operator selection based on probability ranges:
          // [0, crossoverRate) -> Crossover
          // [crossoverRate, crossoverRate + mutationRate) -> Mutation
          // [crossoverRate + mutationRate, 1.0) -> Immigration

          if (useCrossover) {
            lgg.log(`Crossover selected (random=${random.toFixed(3)} < crossoverRate=${config.crossoverRate})`)
            failureTracker.trackCrossoverAttempt()
            const {
              success,
              error,
              data: kid,
            } = await Crossover.crossover({
              parents,
              verbose,
              evaluationInput,
              _evolutionContext,
            })
            if (!success) {
              lgg.error("Crossover failed", error)
              failureTracker.trackCrossoverFailure()
              return []
            }
            lgg.log("Crossover complete")
            children.push(kid)
          } else if (random < config.crossoverRate + config.mutationRate) {
            lgg.log(
              `Mutation selected (random=${random.toFixed(3)} in [${config.crossoverRate}, ${config.crossoverRate + config.mutationRate}))`
            )
            failureTracker.trackMutationAttempt()
            const [parent] = parents
            const mutationOptions: MutationOptions = {
              parent,
              generationNumber: _evolutionContext.generationNumber,
              evolutionMode: population.getRunService().getEvolutionMode(),
            }
            const mutated = await Mutations.mutateWorkflowGenome(mutationOptions)
            lgg.log("Mutation complete")
            if (mutated.success) {
              children = [mutated.data]
            } else {
              lgg.warn(`mutation failed for workflow version ${parent.getWorkflowVersionId()}`)
              failureTracker.trackMutationFailure()
            }
          } else {
            lgg.log(
              `Immigration selected (random=${random.toFixed(3)} >= ${config.crossoverRate + config.mutationRate})`
            )
            failureTracker.trackImmigrationAttempt()
            try {
              const { error, data: baby } = await Genome.createRandom({
                evaluationInput,
                parentWorkflowVersionIds: parents.map((p) => p.getWorkflowVersionId()),
                _evolutionContext,
                problemAnalysis,
                baseWorkflow: undefined,
                evolutionMode: population.getRunService().getEvolutionMode(),
              })
              if (error) {
                console.error("Immigration failed 2", error)
                failureTracker.trackImmigrationFailure()
                return []
              }
              if (baby) children.push(baby)
            } catch (e) {
              lgg.error("Immigration failed", e, truncater(JSON.stringify(e), 1000))
              failureTracker.trackImmigrationFailure()
            }
          }
        } catch (e) {
          lgg.error(`Operation failed for parents ${parents.map((p) => p.getWorkflowVersionId()).join(", ")}`, e)
        }
        return children
      })

      const batchResults = await parallelLimit(offspringTasks, (task) => task())
      offspring.push(...batchResults.flat())
      attempts += currentBatchSize

      lgg.info(
        `[generateOffspring] 
        Batch complete: ${batchResults.flat().length} new offspring, 
        total: ${offspring.length}/${config.offspringCount},
        attempts: ${attempts}/${maxAttempts}`
      )
    }

    return { offspring, attempts }
  }

  /**
   * Verify offspring and filter out invalid ones
   */
  private static async verifyOffspring({
    offspring,
    verificationCache,
    config,
  }: {
    offspring: Genome[]
    verificationCache: VerificationCache
    config: EvolutionSettings
  }): Promise<{
    validOffspring: Genome[]
    invalidCount: number
  }> {
    const validOffspring: Genome[] = []
    let invalidCount = 0
    const maxFailures = Math.max(50, config.offspringCount * 5)

    for (const child of offspring) {
      if (validOffspring.length >= config.offspringCount) break
      if (invalidCount >= maxFailures) {
        lgg.error(
          `[Select] 
          Circuit breaker triggered: ${invalidCount} 
          invalid offspring generated (max: ${maxFailures}). 
          Stopping verification.
          `
        )
        break
      }

      const { valid } = await verificationCache.verifyWithCache(child)

      if (valid) {
        validOffspring.push(child)
      } else {
        invalidCount++
      }
    }

    lgg.info(
      `[Select] Offspring verification complete: ${validOffspring.length} valid, ${invalidCount} invalid out of ${offspring.length} total`
    )

    return { validOffspring, invalidCount }
  }

  /**
   * Generate λ offspring for the next generation.
   * ES + λ
   *
   * @param offspring_count – how many children to create (λ)
   * @param crossoverRate            – probability of creating a child by crossover
   * @param verbose                  – if true, log extra details
   * @returns                        – array of verified, persisted offspring genomes
   */
  public static async createNextGeneration({
    population,
    verificationCache,
    config,
    evaluationInput,
    _evolutionContext,
    problemAnalysis,
  }: {
    population: Population
    verificationCache: VerificationCache
    config: EvolutionSettings
    evaluationInput: EvaluationInput
    _evolutionContext: EvolutionContext
    problemAnalysis: string
  }): Promise<Genome[]> {
    // Remove genomes that are invalid (e.g., failed evaluation) before breeding
    const validGenomesArr = population.getValidGenomes()
    const invalidCount = population.size() - validGenomesArr.length

    if (invalidCount > 0) {
      lgg.warn(`[Select] Discarding ${invalidCount} invalid genomes before next generation`)
      // Keep generation number unchanged while pruning
      population.setPopulation(validGenomesArr)
    }

    // Ensure we still have enough parents for crossover
    if (validGenomesArr.length < config.numberOfParentsCreatingOffspring) {
      throw new Error(
        `Insufficient valid genomes (${validGenomesArr.length}) to select ${config.numberOfParentsCreatingOffspring} parents.`
      )
    }

    // generate unverified offspring
    const { offspring: rawOffspring, attempts } = await this.generateOffspring({
      population,
      config,
      nextGen: _evolutionContext.generationNumber,
      evaluationInput,
      _evolutionContext,
      problemAnalysis,
    })

    // verify offspring and filter out invalid ones
    const { validOffspring } = await this.verifyOffspring({
      offspring: rawOffspring,
      verificationCache,
      config,
    })

    if (isNir(validOffspring)) {
      throw new Error(
        `Failed to generate any valid offspring after ${attempts} attempts. All generated workflows are invalid.`
      )
    }

    // combine parents + offspring into one pool
    const combined: Genome[] = population.getGenomes().concat(validOffspring)

    // sort by descending fitness
    combined.sort((a, b) => {
      const aFitness = a.isEvaluated ? a.getFitnessScore() : -Infinity
      const bFitness = b.isEvaluated ? b.getFitnessScore() : -Infinity
      return bFitness - aFitness
    })

    // --- Bulletproof population size property ---
    const popSize = config.populationSize
    if (!popSize) {
      throw new Error("Population size not specified in config (population_size or populationSize required)")
    }
    // truncate to μ survivors (population size)
    const nextGenIndividuals = combined.slice(0, popSize)

    // Reset genomes for new generation to ensure re-evaluation and WorkflowInvocation creation
    nextGenIndividuals.forEach((genome) => {
      genome.reset({
        runId: _evolutionContext.runId,
        generationId: _evolutionContext.generationId,
        generationNumber: _evolutionContext.generationNumber,
      })
    })

    // update population with survivors and sync generation number
    population.setPopulation(nextGenIndividuals)

    // Log failure tracking stats for this generation
    const stats = failureTracker.getStats()
    const rates = failureTracker.getFailureRates()
    lgg.info(`[Select] Generation ${population.getGenerationNumber()} complete. Failure stats:
      Mutations: ${stats.mutationFailures}/${stats.totalAttempts.mutations} failed (${rates.mutationFailureRate.toFixed(1)}%)
      Crossovers: ${stats.crossoverFailures}/${stats.totalAttempts.crossovers} failed (${rates.crossoverFailureRate.toFixed(1)}%)
      Immigrations: ${stats.immigrationFailures}/${stats.totalAttempts.immigrations} failed (${rates.immigrationFailureRate.toFixed(1)}%)
      Evaluations: ${stats.evaluationFailures}/${stats.totalAttempts.evaluations} failed (${rates.evaluationFailureRate.toFixed(1)}%)
      Data saved to: gp_failure_tracking_${stats.sessionId}.json`)

    // return the μ survivors
    return nextGenIndividuals
  }
}
