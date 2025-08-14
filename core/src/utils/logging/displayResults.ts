import type { FlowEvolutionMode } from "@core/types"
import { lgg } from "@core/utils/logging/Logger"

type IterativeResult = {
  results: Array<{
    iteration: number
    fitness: { score: number }
    cost: number
    transcript: string
  }>
  totalCost: number
  logFilePath: string
}

type GeneticResult = {
  results: Array<{
    finalFitness: number
    totalCost: number
    generations: number
  }>
  totalCost: number
  overallBest: {
    finalFitness: number
  }
}

/**
 * display evolution results in a unified format
 */
export function displayResults(
  type: FlowEvolutionMode,
  evolutionResults: IterativeResult | GeneticResult
) {
  const { totalCost } = evolutionResults

  lgg.log(
    `\n✅ ${type === "iterative" ? "Iterative" : "GP"} Evolution Complete`
  )
  lgg.log(`💰 Total Cost: $${totalCost.toFixed(2)}`)

  if (type === "iterative") {
    const iterativeResults = evolutionResults as IterativeResult
    if (iterativeResults.results.length === 0) {
      lgg.log("🚨 No results found")
      return
    }
    const finalFitness =
      iterativeResults.results[iterativeResults.results.length - 1].fitness
        .score
    lgg.log(`🏆 Final Fitness: ${finalFitness.toFixed(3)}`)

    lgg.log("\n📊 Iteration Summary:")
    iterativeResults.results.forEach((result, index) => {
      lgg.log(
        `${index + 1}: Fitness ${result.fitness.score.toFixed(3)}, Cost $${result.cost.toFixed(3)}`
      )
    })
  } else if (type === "GP") {
    const geneticResults = evolutionResults as GeneticResult
    const finalFitness =
      geneticResults.results[geneticResults.results.length - 1].finalFitness
    lgg.log(`🏆 Final Fitness: ${finalFitness.toFixed(3)}`)

    lgg.log("\n📊 Run Summary:")
    geneticResults.results.forEach((result, index) => {
      lgg.log(
        `${index + 1}: Fitness ${result.finalFitness.toFixed(3)}, Cost $${result.totalCost.toFixed(2)}`
      )
    })
  } else {
    const geneticResults = evolutionResults as GeneticResult
    lgg.log(
      `🏆 Best Overall Fitness: ${geneticResults.overallBest.finalFitness.toFixed(3)}`
    )

    lgg.log("\n📊 Run Summary:")
    geneticResults.results.forEach((result, index) => {
      lgg.log(
        `Run ${index + 1}: Fitness ${result.finalFitness.toFixed(3)}, Cost $${result.totalCost.toFixed(2)}`
      )
    })
  }
}
