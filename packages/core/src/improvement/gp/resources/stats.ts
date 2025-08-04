import type { FlowEvolutionConfig } from "@/interfaces/runtimeConfig"
import { lgg } from "@/utils/logging/Logger"
import type { Genome } from "../Genome"
import type { Population } from "../Population"
import type { RunService } from "../RunService"
import type { PopulationStats } from "./gp.types"

/**
 * Centralized performance tracking and metrics management for evolution
 */
export class StatsTracker {
  private totalCost = 0
  private startTime: number
  private evaluationCount = 0
  private stats: PopulationStats[] = []

  constructor(
    private config: FlowEvolutionConfig,
    private runService: RunService,
    private population: Population
  ) {
    this.startTime = Date.now()
  }

  /**
   * Add cost to the total
   */
  addCost(cost: number): void {
    this.totalCost += cost
  }

  /**
   * Increment evaluation count
   */
  incrementEvaluationCount(): void {
    this.evaluationCount++
  }

  /**
   * Get current total cost
   */
  getTotalCost(): number {
    return this.totalCost
  }

  /**
   * Get current evaluation count
   */
  getEvaluationCount(): number {
    return this.evaluationCount
  }

  /**
   * Get elapsed time in minutes
   */
  getElapsedMinutes(): number {
    return (Date.now() - this.startTime) / (1000 * 60)
  }

  /**
   * Calculate evaluations per hour
   */
  getEvaluationsPerHour(): number {
    const elapsedMinutes = this.getElapsedMinutes()
    return elapsedMinutes > 0 ? (this.evaluationCount / elapsedMinutes) * 60 : 0
  }

  /**
   * Calculate improvement rate from previous generation
   */
  calculateImprovementRate(currentBestFitness: number): number {
    if (this.stats.length === 0) return 0
    const previousBestFitness = this.stats[this.stats.length - 1].bestFitness
    return currentBestFitness - previousBestFitness
  }

  /**
   * Record generation stats and log summary
   */
  recordGenerationStats(): PopulationStats {
    const best = this.population.getBest()
    const improvementRate = this.calculateImprovementRate(
      best.getFitness()?.score ?? 0
    )

    const stats = this.population.getStats({
      evaluationCost: this.totalCost,
      evaluationsPerHour: this.getEvaluationsPerHour(),
      improvementRate,
    })

    this.stats.push(stats)

    // Log generation summary
    this.logGenerationSummary(best)

    return stats
  }

  /**
   * Get all recorded stats
   */
  getAllStats(): PopulationStats[] {
    return [...this.stats]
  }

  /**
   * Check if evolution should stop based on various conditions
   */
  shouldStop(): boolean {
    // Cost limit check
    if (
      this.config.GP.maxCostUSD &&
      this.totalCost >= this.config.GP.maxCostUSD
    ) {
      lgg.info(
        `[StatsTracker] Reached cost limit of $${this.config.GP.maxCostUSD}; stopping evolution.`
      )
      return true
    }

    // Time limit check
    const elapsedMinutes = this.getElapsedMinutes()
    if (
      this.config.GP.maximumTimeMinutes &&
      elapsedMinutes > this.config.GP.maximumTimeMinutes
    ) {
      lgg.info(
        `[StatsTracker] Reached time limit of ${this.config.GP.maximumTimeMinutes} minutes; stopping evolution.`
      )
      return true
    }

    // Evaluation rate limit check
    if (
      typeof this.config.GP.maxEvaluationsPerHour === "number" &&
      this.config.GP.maxEvaluationsPerHour > 0
    ) {
      if (this.evaluationCount >= this.config.GP.maxEvaluationsPerHour) {
        lgg.info(
          `[StatsTracker] Reached max evaluations per hour (${this.config.GP.maxEvaluationsPerHour}); stopping evolution.`
        )
        return true
      }
    }

    // Convergence check - if we have enough generations to analyze
    if (this.stats.length >= 5) {
      const recent = this.stats.slice(-5)
      const improvements = recent
        .slice(1)
        .map((s, i) => s.bestFitness - recent[i].bestFitness)

      if (improvements.every((imp: number) => imp < 0.001)) {
        lgg.info(
          `[StatsTracker] Converged; stopping evolution after ${elapsedMinutes.toFixed(1)} minutes.`
        )
        return true
      }
    }

    return false
  }

  /**
   * Log generation summary
   */
  private logGenerationSummary(genome: Genome): void {
    lgg.log(
      `[EvolutionEngine] Gen ${genome.genome.parentWorkflowVersionIds.length} - Best: ${genome.getFitness()?.score.toFixed(3)}, Cost: $${this.totalCost.toFixed(2)}`
    )
  }

  /**
   * Log final evolution summary
   */
  logFinalSummary(genome: Genome): void {
    lgg.log(
      `[EvolutionEngine] Evolution complete - Best: ${genome.getFitness()?.score.toFixed(3)}, id: ${genome.getWorkflowVersionId()}, Cost: $${this.totalCost.toFixed(2)}`
    )
  }

  /**
   * Log evolution start
   */
  logEvolutionStart(): void {
    lgg.log(
      `[EvolutionEngine] Starting evolution process with run ID: ${this.runService.getRunId()}`
    )
  }

  /**
   * Get summary log message for current generation (for external use)
   */
  getGenerationSummary(generationNumber: number, bestFitness: number): string {
    return `Gen ${generationNumber} - Best: ${bestFitness.toFixed(3)}, Cost: $${this.totalCost.toFixed(2)}`
  }

  /**
   * Get final evolution summary (for external use)
   */
  getFinalSummary(bestFitness: number, bestWorkflowVersionId: string): string {
    return `Evolution complete - Best: ${bestFitness.toFixed(3)}, id: ${bestWorkflowVersionId}, Cost: $${this.totalCost.toFixed(2)}`
  }

  /**
   * Check if evolution was interrupted (didn't complete all generations)
   */
  wasInterrupted(): boolean {
    return this.stats.length < this.config.generationAmount
  }

  /**
   * Get final status for database
   */
  getFinalStatus(): "completed" | "interrupted" {
    return this.wasInterrupted() ? "interrupted" : "completed"
  }

  /**
   * Reset for new evolution run (if needed)
   */
  reset(): void {
    this.totalCost = 0
    this.startTime = Date.now()
    this.evaluationCount = 0
    this.stats = []
  }
}
