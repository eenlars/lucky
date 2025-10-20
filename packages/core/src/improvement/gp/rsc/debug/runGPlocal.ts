import type { EvolutionEvaluator } from "@core/evaluation/evaluators/EvolutionEvaluator"
import { createMockEvaluationInputGeneric } from "@core/utils/__tests__/setup/coreMocks"
import { lgg } from "@core/utils/logging/Logger"
import type { RS } from "@lucky/shared"
import type { Genome } from "../../Genome"
import { EvolutionEngine } from "../../evolutionengine"
import type { GenomeEvaluationResults, PopulationStats } from "../gp.types"

// run with tsx --env-file=.env src/core/improvement/gp/resources/runGPlocal.ts

const runEvolution = async () => {
  lgg.log("starting local GP run...")

  const config = EvolutionEngine.createDefaultConfig({
    generations: 8,
    populationSize: 5,
    eliteSize: 1,
    maxCostUSD: 10,
    maxEvaluationsPerHour: 50,
    evaluationDataset: "none",
    mutationParams: {
      mutationInstructions: "default mutation strategy",
    },
  })

  const engine = new EvolutionEngine(config, "GP")

  // mock evaluator for testing
  const mockEvaluator: EvolutionEvaluator = {
    evaluate: async (
      genome: Genome,
      _evolutionContext?: { runId: string; generationId: string },
    ): Promise<RS<GenomeEvaluationResults>> => {
      lgg.log(`evaluating genome: ${genome.getWorkflowVersionId()}`)

      // always return a valid score for testing
      return {
        success: true,
        usdCost: 0.01,
        data: {
          workflowVersionId: genome.getWorkflowVersionId(),
          costOfEvaluation: 0.01,
          fitness: {
            score: Math.random(),
            totalCostUsd: 0.01,
            totalTimeSeconds: 1,
            accuracy: 0.9,
          },
          hasBeenEvaluated: true,
          evaluatedAt: new Date().toISOString(),
          errors: [],
          feedback: "test feedback",
        },
      }
    },
  }

  try {
    lgg.warn("watch out, baseWorkflow is undefined")
    // Set a timeout for the evolution process
    const evolutionPromise = engine.evolve({
      evaluationInput: createMockEvaluationInputGeneric(),
      evaluator: mockEvaluator,
      _baseWorkflow: undefined,
      problemAnalysis: "dummy-problem-analysis",
    })

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Evolution timed out after 60 seconds")), 60000),
    )

    const { bestGenome, stats, totalCost } = (await Promise.race([evolutionPromise, timeoutPromise])) as {
      bestGenome: Genome
      stats: PopulationStats[]
      totalCost: number
    }

    lgg.log("\n--- evolution complete ---")
    lgg.log(`best genome workflowVersionId: ${bestGenome.getWorkflowVersionId()}`)
    lgg.log(`best genome raw: ${JSON.stringify(bestGenome.getRawGenome(), null, 2)}`)
    lgg.log(`total cost: $${totalCost.toFixed(2)}`)
    lgg.log("population stats:")
    stats.forEach((s: unknown) => lgg.log(JSON.stringify(s)))
  } catch (error) {
    lgg.error("evolution error:", error)
  } finally {
    lgg.log("database closed.")
    process.exit(0)
  }
}

runEvolution()
