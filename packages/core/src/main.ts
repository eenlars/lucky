// src/core/main.ts

/**
 * Main entry point for the evolutionary workflow system.
 *
 * ## Runtime Architecture
 *
 * Orchestrates two evolution modes:
 * - **Cultural Evolution**: Iterative self-improvement through analysis
 * - **Genetic Programming**: Population-based evolution with crossover/mutation
 *
 * ## Command Line Interface
 *
 * ```bash
 * tsx src/core/main.ts --mode=<cultural|GP> [options]
 * ```
 *
 * Options:
 * - `--generations=<num>`: Override generation count for GP
 * - `--population=<num>`: Override population size for GP
 * - `--setup-file=<path>`: Use custom workflow setup file
 *
 * ## Execution Flow
 *
 * 1. **Initialization**: Parse CLI args, load configuration
 * 2. **Mode Selection**: Route to iterative or GP evolution
 * 3. **Evolution Loop**: Execute iterations with progress tracking
 * 4. **Result Saving**: Persist evolved workflows incrementally
 * 5. **Final Report**: Display performance metrics and costs
 *
 * ## Robust Execution
 *
 * Iterative evolution includes:
 * - Retry mechanism for failed iterations (2 retries)
 * - Circuit breaker for consecutive failures (10% tolerance)
 * - Incremental saving of successful configurations
 * - Rollback to last successful state on failure
 *
 * ## Resource Management
 *
 * - Spending limits enforced via SpendingTracker
 * - Cost aggregation across all iterations
 * - Early termination on budget exhaustion
 * - Database tracking of evolution runs
 */

import { CONFIG, PATHS } from "@core/core-config/compat"
import { SELECTED_QUESTION } from "@core/core-config/compat"
import { AggregatedEvaluator } from "@core/evaluation/evaluators/AggregatedEvaluator"
import { GPEvaluatorAdapter } from "@core/evaluation/evaluators/GPEvaluatorAdapter"
import { prepareProblem } from "@core/improvement/behavioral/prepare/workflow/prepareMain"
import { RunService } from "@core/improvement/gp/RunService"
import { EvolutionEngine } from "@core/improvement/gp/evolutionengine"
import type { IterativeConfig } from "@core/improvement/gp/resources/evolution-types"
import type { GenomeEvaluationResults, WorkflowGenome } from "@core/improvement/gp/resources/gp.types"
import { ArgumentParsingError, parseCliArguments } from "@core/utils/cli/argumentParser"
import { lgg } from "@core/utils/logging/Logger"
import { displayResults } from "@core/utils/logging/displayResults"
import { SpendingTracker } from "@core/utils/spending/SpendingTracker"
import { Workflow } from "@core/workflow/Workflow"
import { guard } from "@core/workflow/schema/errorMessages"
import { hashWorkflow } from "@core/workflow/schema/hash"
import { loadSingleWorkflow, persistWorkflow, saveWorkflowConfigToOutput } from "@core/workflow/setup/WorkflowLoader"
import { SupabasePersistence } from "@together/adapter-supabase"
import chalk from "chalk"

// Parse command line arguments
const args = process.argv.slice(2)
let parsedArgs: ReturnType<typeof parseCliArguments>

try {
  parsedArgs = parseCliArguments(args)
} catch (error) {
  if (error instanceof ArgumentParsingError) {
    lgg.error(`❌ Argument parsing failed: ${error.message}`)
    lgg.info(
      "Usage: tsx src/core/main.ts --mode=<iterative|GP> [--generations=<num>] [--population=<num>] [--setup-file=<path>]",
    )
    process.exit(1)
  }
  throw error
}

const EVOLUTION_MODE = parsedArgs.mode
const cliGenerations = parsedArgs.generations
const cliPopulationSize = parsedArgs.populationSize
const cliSetupFile = parsedArgs.setupFile

if (!EVOLUTION_MODE) {
  lgg.error("❌ Evolution mode must be specified with --mode=iterative or --mode=GP")
  lgg.info(
    "Usage: tsx src/core/main.ts --mode=<iterative|GP> [--generations=<num>] [--population=<num>] [--setup-file=<path>]",
  )
  process.exit(1)
}
const mode = EVOLUTION_MODE

// Updated destructuring without mode, with CLI overrides
const {
  evolution: {
    GP: { generations: configGenerations, populationSize: configPopulationSize },
    iterativeIterations: ITERATIVE_EVOLUTION_ITERATIONS,
  },
} = CONFIG

const GP_GENERATIONS = cliGenerations ?? configGenerations
const GP_POPULATION_SIZE = cliPopulationSize ?? configPopulationSize

type IterativeResult = {
  results: Array<{
    iteration: number
    fitness: { score: number }
    cost: number
    transcript: string
    retryCount?: number
  }>
  totalCost: number
  logFilePath: string
  stats: {
    successful: number
    failed: number
    recovered: number
  }
}

type IterationConfig = {
  maxRetries: number
  maxConsecutiveFailures: number
  backoffMs: number
}

// configuration for robust iteration execution with failure recovery
const ROBUST_CONFIG: IterationConfig = {
  maxRetries: 2,
  maxConsecutiveFailures: Math.max(3, Math.floor(ITERATIVE_EVOLUTION_ITERATIONS * 0.1)), // 10% failure tolerance
  backoffMs: 1000,
}

type GeneticResult = {
  results: Array<{
    bestGenome: WorkflowGenome
    bestScore: GenomeEvaluationResults
    finalFitness: number
    totalCost: number
    generations: number
  }>
  totalCost: number
  overallBest: {
    bestGenome: WorkflowGenome
    bestScore: GenomeEvaluationResults
    finalFitness: number
    totalCost: number
    generations: number
  }
}

/**
 * Executes either cultural or genetic evolution depending on the configured mode.
 * Both share a common logging and result-handling structure, so we unify them here.
 *
 * Iterative evolution iteratively improves a single workflow through analysis.
 * Genetic evolution maintains a population and uses crossover/mutation.
 */
async function runEvolution(): Promise<IterativeResult | GeneticResult> {
  // Create persistence adapter
  const persistence = new SupabasePersistence()

  // Persistence is now passed explicitly through the call chain

  /* ------------------------------------------------------------------
   * ITERATIVE IMPROVEMENT
   * ------------------------------------------------------------------ */
  if (mode === "iterative") {
    const runService = new RunService(true, mode, undefined, persistence)

    // create iterative evolution config
    const iterativeConfig: IterativeConfig = {
      mode: "iterative" as const,
      iterations: ITERATIVE_EVOLUTION_ITERATIONS,
      question: SELECTED_QUESTION,
    }

    // create evolution run in database
    await runService.createRun(SELECTED_QUESTION.goal, iterativeConfig)

    // initialize spending tracker
    if (CONFIG.limits.enableSpendingLimits) {
      SpendingTracker.getInstance().initialize(CONFIG.limits.maxCostUsdPerRun)
      lgg.log(`spending limit: $${CONFIG.limits.maxCostUsdPerRun}`)
    }

    let setup = await loadSingleWorkflow(cliSetupFile ?? PATHS.setupFile)
    guard(setup, "Setup not found")

    let totalCost = 0
    let parent1Id: string | undefined = undefined
    const parent2Id: string | undefined = undefined
    const results: IterativeResult["results"] = []
    const stats = { successful: 0, failed: 0, recovered: 0 }
    let lastSuccessfulConfig = setup
    let consecutiveFailures = 0

    lgg.log("starting iterative evolution workflow", {
      mainQuestion: SELECTED_QUESTION.goal,
      iterations: ITERATIVE_EVOLUTION_ITERATIONS,
    })

    // Save initial workflow to Generation 0 before any iterations
    const initialConfigHash = hashWorkflow(setup).substring(0, 8)
    const runSuffix = runService.getRunId().slice(-6)
    const initialWfVersionId = `wf_ver_${initialConfigHash}_${runSuffix}_00`

    Workflow.create({
      config: setup,
      evaluationInput: SELECTED_QUESTION,
      persistence,
      parent1Id: undefined,
      parent2Id: undefined,
      evolutionContext: runService.getEvolutionContext(),
      toolContext: SELECTED_QUESTION.outputSchema ? { expectedOutputType: SELECTED_QUESTION.outputSchema } : undefined,
      workflowVersionId: initialWfVersionId,
    })

    lgg.log(`💾 Saved initial workflow to Generation 0: ${initialWfVersionId}`)

    // create aggregated evaluator for all questions
    const aggregatedEvaluator = new AggregatedEvaluator()

    let countIO = 0

    // robust iteration execution with failure recovery
    // returns true if successful, false if all retries exhausted
    async function executeIteration(iterationIndex: number): Promise<boolean> {
      const iteration = iterationIndex + 1

      for (let retry = 0; retry <= ROBUST_CONFIG.maxRetries; retry++) {
        try {
          if (retry > 0) {
            lgg.log(`🔄 Retry ${retry}/${ROBUST_CONFIG.maxRetries} for iteration ${iteration}`)
            // rollback to last known good configuration
            setup = lastSuccessfulConfig
            // exponential backoff for retry attempts
            await new Promise(resolve => setTimeout(resolve, ROBUST_CONFIG.backoffMs * retry))
          }

          // Create a unique workflow version per generation/iteration to capture lineage
          const configHash = hashWorkflow(setup).substring(0, 8)
          const runSuffix = runService.getRunId().slice(-6)
          const iterationSuffix = String(runService.getEvolutionContext().generationNumber).padStart(2, "0")
          const wfVersionId = `wf_ver_${configHash}_${runSuffix}_${iterationSuffix}`

          const runner = Workflow.create({
            config: setup,
            evaluationInput: SELECTED_QUESTION,
            persistence,
            parent1Id,
            parent2Id,
            evolutionContext: runService.getEvolutionContext(),
            toolContext: SELECTED_QUESTION.outputSchema
              ? { expectedOutputType: SELECTED_QUESTION.outputSchema }
              : undefined,
            workflowVersionId: wfVersionId,
          })

          await runner.prepareWorkflow(SELECTED_QUESTION, CONFIG.workflow.prepareProblemMethod)
          const { success, error, data: evaluationResult } = await aggregatedEvaluator.evaluate(runner)

          if (!success) {
            lgg.error(
              `[IterativeEvolution] Evaluation failed for 
              genome ${runner.getWorkflowVersionId()}:
              ${JSON.stringify(error, null, 2)}`,
            )
            continue
          }

          countIO = runner.getWorkflowIO().length

          const { newConfig, cost: improveCost } = await runner.improveNodesIteratively({
            _fitness: evaluationResult.fitness,
            workflowInvocationId: runner.getWorkflowInvocationId(0),
          })

          const iterationCost = evaluationResult.cost + improveCost
          totalCost += iterationCost

          results.push({
            iteration,
            fitness: evaluationResult.fitness,
            cost: iterationCost,
            transcript: evaluationResult.transcript,
            retryCount: retry,
          })

          lgg.log(
            `📊 Iteration ${iteration} – Fitness: ${evaluationResult.fitness.score.toFixed(3)} · Cost: $${iterationCost.toFixed(2)}${retry > 0 ? " (recovered)" : ""}`,
          )

          // Update setup for next iteration and save to file incrementally
          setup = newConfig
          lastSuccessfulConfig = newConfig

          // Save updated configuration after each successful iteration
          const targetFile = cliSetupFile ?? PATHS.setupFile
          await persistWorkflow(
            newConfig,
            targetFile,
            true, // Create backup for incremental saves
          )
          lgg.log(`💾 Saved evolved configuration after iteration ${iteration}: ${targetFile}`)

          // Chain lineage to next iteration
          parent1Id = runner.getWorkflowVersionId()

          if (retry > 0) stats.recovered++
          stats.successful++
          return true
        } catch (error) {
          console.log(`❌ Iteration ${iteration} attempt ${retry + 1} failed:`, error)
          lgg.error(`❌ Iteration ${iteration} attempt ${retry + 1} failed:`, error)
          // Persist detailed error to a file for retries
          await lgg.logAndSave(`iterative-retry-error-it${iteration}-try${retry + 1}.json`, {
            iteration,
            attempt: retry + 1,
            workflowVersionId: parent1Id,
            runId: runService.getRunId(),
            generationId: runService.getCurrentGenerationId(),
            error:
              error instanceof Error
                ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                  }
                : String(error),
          })
        }
      }

      stats.failed++
      lgg.error(`💥 Iteration ${iteration} permanently failed. Continuing with last successful config.`)
      setup = lastSuccessfulConfig
      return false
    }

    const startIteration = 0

    // main evolution loop with circuit breaker
    for (let i = startIteration; i < ITERATIVE_EVOLUTION_ITERATIONS; i++) {
      if (consecutiveFailures >= ROBUST_CONFIG.maxConsecutiveFailures) {
        lgg.error(`🚨 Circuit breaker: ${consecutiveFailures} consecutive failures. Stopping.`)
        break
      }

      lgg.log(`\n🔄 Evolution Iteration ${i + 1}/${ITERATIVE_EVOLUTION_ITERATIONS}`)

      // 1 iteration = 1 generation (create once per iteration, retries reuse this)
      await runService.createNewGeneration()

      const success = await executeIteration(i)
      consecutiveFailures = success ? 0 : consecutiveFailures + 1
    }

    const successRate = (stats.successful / (stats.successful + stats.failed)) * 100

    lgg.log("iterative evolution completed", {
      ...stats,
      totalWorkflowCases: countIO,
      totalCost,
      finalFitness: results.at(-1)?.fitness?.score,
      successRate: `${successRate.toFixed(1)}%`,
    })

    // Mark as completed if success rate > 80%, otherwise failed
    const runStatus = successRate > 80 ? "completed" : "failed"

    // Always save final configuration to setupfile after iterative evolution run
    if (lastSuccessfulConfig) {
      const targetFile = cliSetupFile ?? PATHS.setupFile
      await persistWorkflow(
        lastSuccessfulConfig,
        targetFile,
        false, // Create backup for final result
      )
      lgg.log(`💾 Updated setupfile with evolved configuration: ${targetFile}`)
    }
    await runService.completeRun(runStatus, totalCost, undefined)

    const logFilePath = await lgg.finalizeWorkflowLog()
    return { results, totalCost, logFilePath: logFilePath ?? "", stats }
  }

  /* ------------------------------------------------------------------
   * 🧬  GENETIC PROGRAMMING EVOLUTION
   * ------------------------------------------------------------------ */
  const allRunResults: GeneticResult["results"] = []
  let totalCostAllRuns = 0

  lgg.log(`\n🧬 Starting Genetic Programming with ${SELECTED_QUESTION.type} workflow cases`)

  // initialize spending tracker for GP
  if (CONFIG.limits.enableSpendingLimits) {
    SpendingTracker.getInstance().initialize(CONFIG.limits.maxCostUsdPerRun)
    lgg.log(`spending limit: $${CONFIG.limits.maxCostUsdPerRun}`)
  }

  // create evolution config for aggregated evaluation
  const evolutionSettings = EvolutionEngine.createDefaultConfig({
    populationSize: GP_POPULATION_SIZE,
    generations: GP_GENERATIONS,
    offspringCount: Math.floor(GP_POPULATION_SIZE * 0.8),
    maxCostUSD: CONFIG.limits.maxCostUsdPerRun,
    maxEvaluationsPerHour: 500,
    immigrantRate: 3,
    immigrantInterval: 5,
  })

  const { problemAnalysis, workflowIO, newGoal } = await prepareProblem(
    SELECTED_QUESTION,
    CONFIG.workflow.prepareProblemMethod,
  )

  // create evaluator with all workflow cases, and evaluate.
  // returns the fitness and feedback for each genome.
  // the genomes have not been reset after running this.
  const evaluator = new GPEvaluatorAdapter(workflowIO, newGoal, problemAnalysis)

  const evolutionEngine = new EvolutionEngine(evolutionSettings, "GP", undefined, persistence)

  // Determine optional base workflow for GP mode using the Loader (centralized logging)
  let baseWorkflowForGP: ReturnType<typeof loadSingleWorkflow> extends Promise<infer T> ? T | undefined : undefined
  if (CONFIG.evolution.GP.initialPopulationMethod === "baseWorkflow") {
    const requestedGPFile = cliSetupFile ?? CONFIG.evolution.GP.initialPopulationFile
    baseWorkflowForGP = await loadSingleWorkflow(requestedGPFile ?? undefined)
  }

  lgg.log("evolving workflow to handle all cases optimally", {
    workflowCasesCount: SELECTED_QUESTION.type === "csv" ? (SELECTED_QUESTION.evaluation?.length ?? 0) : 1,
    populationSize: GP_POPULATION_SIZE,
    generations: GP_GENERATIONS,
  })

  let evolutionResult: any
  try {
    evolutionResult = await evolutionEngine.evolve({
      evaluationInput: SELECTED_QUESTION,
      evaluator,
      _baseWorkflow: baseWorkflowForGP,
      problemAnalysis,
    })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    lgg.error(`[main] Evolution failed: ${errorMsg}`)

    if (error instanceof Error) {
      lgg.error("[main] Stack trace:", error.stack)
      lgg.error(`[main] Error name: ${error.name}`)
      if (error.cause) {
        lgg.error("[main] Error cause:", error.cause)
      }
    }

    lgg.error("[main] Evolution context:")
    lgg.error(`[main] - Population size: ${GP_POPULATION_SIZE}`)
    lgg.error(`[main] - Generations: ${GP_GENERATIONS}`)
    lgg.error(`[main] - Question type: ${SELECTED_QUESTION.type}`)
    lgg.error(`[main] - Evaluator: ${evaluator.constructor.name}`)

    throw error
  }

  const { bestGenome, totalCost, stats } = evolutionResult

  totalCostAllRuns = totalCost

  // store single aggregated result
  allRunResults.push({
    bestGenome: bestGenome.getRawGenome(),
    bestScore: {
      workflowVersionId: bestGenome.getWorkflowVersionId(),
      hasBeenEvaluated: true,
      evaluatedAt: new Date().toISOString(),
      fitness: bestGenome.getFitness() ?? null,
      costOfEvaluation: 0,
      errors: [],
      feedback: bestGenome.getFeedback() ?? null,
    },
    finalFitness: bestGenome.getFitness()?.score ?? 0,
    totalCost: totalCost,
    generations: stats.length,
  })

  lgg.log("\n📊 GP evolution complete:")
  lgg.log(`Best Aggregated Fitness: ${bestGenome.getFitness()?.score.toFixed(3)}`)
  lgg.log(`Total Cost:  $${totalCost.toFixed(2)}`)
  lgg.log(`Generations: ${stats.length}`)
  lgg.log(
    `Workflow Cases Evaluated: ${SELECTED_QUESTION.type === "csv" ? SELECTED_QUESTION.evaluation?.length || 0 : 1}`,
  )

  const overallBest = allRunResults.reduce((best, curr) => (curr.finalFitness > best.finalFitness ? curr : best))

  await saveWorkflowConfigToOutput(
    {
      entryNodeId: overallBest.bestGenome.entryNodeId,
      nodes: overallBest.bestGenome.nodes,
    },
    "best_enhanced_gp_workflow.json",
  )

  return { results: allRunResults, totalCost: totalCostAllRuns, overallBest }
}

async function main() {
  try {
    lgg.log(chalk.green(`🚀 Starting Evolution Mode: ${mode.toUpperCase()}`))

    if (mode === "GP") {
      lgg.log(`Population Size: ${GP_POPULATION_SIZE}`)
      lgg.log(`Generations:     ${GP_GENERATIONS}`)
    } else {
      lgg.log(`Iterations:      ${ITERATIVE_EVOLUTION_ITERATIONS}`)
    }

    const results = await runEvolution()
    displayResults(mode, results)

    process.exit(0)
  } catch (err) {
    lgg.error("❌ Workflow failed:", err)
    if (err instanceof Error) {
      lgg.error("Stack trace:", err.stack)
    }
    process.exit(1)
  }
}

// Export for testing
export default main

// Only run main when this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}
