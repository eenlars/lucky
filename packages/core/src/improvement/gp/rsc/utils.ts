/**
 * Utility functions for genetic programming operations
 * Consolidated from duplicate implementations across files
 */

import { guard } from "@core/workflow/schema/errorMessages"
import type { Genome } from "../Genome"

/**
 * Population statistics utilities
 */
export class EvolutionUtils {
  /**
   * Calculate basic statistics for a population
   */
  static calculateStats(genomes: Genome[]): {
    avgFitness: number
    stdDev: number
    bestFitness: number
    worstFitness: number
  } {
    if (genomes.length === 0) {
      return { avgFitness: 0, stdDev: 0, bestFitness: 0, worstFitness: 0 }
    }

    const fitnesses = genomes.map(g => g.getFitnessScore())
    const avgFitness = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length
    const variance = fitnesses.reduce((sum, f) => sum + (f - avgFitness) ** 2, 0) / fitnesses.length
    const stdDev = Math.sqrt(variance)
    const bestFitness = Math.max(...fitnesses)
    const worstFitness = Math.min(...fitnesses)

    const round2 = (n: number) => Math.round(n * 100) / 100

    return {
      avgFitness: round2(avgFitness),
      stdDev: round2(stdDev),
      bestFitness: round2(bestFitness),
      worstFitness: round2(worstFitness),
    }
  }

  /**
   * Find genomes similar to target based on structural fingerprint distance
   */
  static findSimilarGenomes(population: Genome[], target: Genome, threshold = 0.1): Genome[] {
    const targetFingerprint = EvolutionUtils.structuralFingerprintFromRaw(target)
    return population.filter(genome => {
      if (genome.getWorkflowVersionId() === target.getWorkflowVersionId()) return false
      const genomeFingerprint = EvolutionUtils.structuralFingerprintFromRaw(genome)
      const distance = EvolutionUtils.fingerprintDistance(targetFingerprint, genomeFingerprint)
      return distance <= threshold
    })
  }

  static structuralFingerprintFromRaw(genomeIn: Genome): number[] {
    const genome = genomeIn.getRawGenome()
    guard(genome.nodes, "genome must have nodes")
    const features: number[] = []

    // aggregate features across all nodes
    let totalDescriptionLength = 0
    let totalDescriptionWords = 0
    let totalDescriptionSentences = 0
    let totalSystemPromptLength = 0
    let totalSystemPromptWords = 0
    let totalMcpTools = 0
    let totalCodeTools = 0
    let totalHandOffs = 0

    for (const node of genome.nodes) {
      // description features
      totalDescriptionLength += node.description.length
      totalDescriptionWords += node.description.split(" ").length
      totalDescriptionSentences += node.description.split(".").length

      // system prompt features
      totalSystemPromptLength += node.systemPrompt.length
      totalSystemPromptWords += node.systemPrompt.split(" ").length

      // tool usage
      totalMcpTools += node.mcpTools.length
      totalCodeTools += node.codeTools.length
      totalHandOffs += node.handOffs.length
    }

    // workflow-level features
    features.push(genome.nodes.length / 10) // number of nodes normalized

    // aggregated node features (normalized)
    features.push(totalDescriptionLength / 1000) // normalize to ~0-1 range
    features.push(totalDescriptionWords / 100) // word count
    features.push(totalDescriptionSentences / 10) // sentence count

    // system prompt features
    features.push(totalSystemPromptLength / 1000)
    features.push(totalSystemPromptWords / 100)

    // tool usage
    features.push(totalMcpTools / 10)
    features.push(totalCodeTools / 10)
    features.push(totalHandOffs / 5)

    return features
  }

  static fingerprintDistance(fp1: number[], fp2: number[]): number {
    if (fp1.length !== fp2.length) {
      throw new Error("Fingerprints must have same length")
    }

    const sumSquares = fp1.reduce((sum, val, i) => {
      const diff = val - fp2[i]
      return sum + diff * diff
    }, 0)

    return Math.sqrt(sumSquares)
  }

  /**
   * Poisson distribution approximation using Knuth's algorithm
   *
   * Generates random integers from a Poisson distribution with parameter lambda.
   * The Poisson distribution models the number of events occurring in a fixed
   * interval when events happen independently at a constant average rate.
   *
   * Algorithm:
   * 1. Calculate L = e^(-lambda) as the threshold
   * 2. Start with k=0 (event counter) and p=1 (cumulative probability)
   * 3. Increment k and multiply p by a random number [0,1)
   * 4. Continue until p drops below the threshold L
   * 5. Return k-1 as the number of events
   *
   * @param lambda - The average rate parameter (must be positive)
   * @returns A non-negative integer following Poisson(lambda) distribution
   */
  static poisson(lambda: number, min?: number, max?: number): number {
    const L = Math.exp(-lambda) // Threshold probability
    let k = 0 // Event counter
    let p = 1 // Cumulative probability product

    do {
      k++ // Increment event count
      p *= Math.random() // Multiply by uniform random [0,1)
    } while (p > L) // Continue until probability drops below threshold

    let result = k - 1 // Final event count

    // Apply min/max constraints if provided
    if (min !== undefined) {
      result = Math.max(result, min)
    }
    if (max !== undefined) {
      result = Math.min(result, max)
    }

    return result
  }
}
