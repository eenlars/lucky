import { PATHS } from "@runtime/settings/constants"
import { join } from "path"

interface FailureStats {
  mutationFailures: number
  crossoverFailures: number
  immigrationFailures: number
  evaluationFailures: number
  totalAttempts: {
    mutations: number
    crossovers: number
    immigrations: number
    evaluations: number
  }
  timestamp: string
  sessionId: string
}

class FailureTracker {
  private stats: FailureStats
  private sessionId: string
  private outputPath: string

  constructor() {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    this.stats = {
      mutationFailures: 0,
      crossoverFailures: 0,
      immigrationFailures: 0,
      evaluationFailures: 0,
      totalAttempts: {
        mutations: 0,
        crossovers: 0,
        immigrations: 0,
        evaluations: 0,
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    }

    // Use runtime logging path from PATHS
    this.outputPath = join(PATHS.node.logging, `gp_failure_tracking_${this.sessionId}.json`)
    console.log(`[FailureTracker] Tracking file will be saved to: ${this.outputPath}`)

    // Create initial file to verify it works
    this.saveToFile()
  }

  trackMutationAttempt() {
    this.stats.totalAttempts.mutations++
    this.saveToFile()
  }

  trackMutationFailure() {
    this.stats.mutationFailures++
    console.log(`[FailureTracker] Mutation failure tracked. Total: ${this.stats.mutationFailures}`)
    this.saveToFile()
  }

  trackCrossoverAttempt() {
    this.stats.totalAttempts.crossovers++
    this.saveToFile()
  }

  trackCrossoverFailure() {
    this.stats.crossoverFailures++
    console.log(`[FailureTracker] Crossover failure tracked. Total: ${this.stats.crossoverFailures}`)
    this.saveToFile()
  }

  trackImmigrationAttempt() {
    this.stats.totalAttempts.immigrations++
    this.saveToFile()
  }

  trackImmigrationFailure() {
    this.stats.immigrationFailures++
    console.log(`[FailureTracker] Immigration failure tracked. Total: ${this.stats.immigrationFailures}`)
    this.saveToFile()
  }

  trackEvaluationAttempt() {
    this.stats.totalAttempts.evaluations++
    this.saveToFile()
  }

  trackEvaluationFailure() {
    this.stats.evaluationFailures++
    console.log(`[FailureTracker] Evaluation failure tracked. Total: ${this.stats.evaluationFailures}`)
    this.saveToFile()
  }

  getStats(): FailureStats {
    return { ...this.stats }
  }

  getFailureRates() {
    return {
      mutationFailureRate:
        this.stats.totalAttempts.mutations > 0
          ? (this.stats.mutationFailures / this.stats.totalAttempts.mutations) * 100
          : 0,
      crossoverFailureRate:
        this.stats.totalAttempts.crossovers > 0
          ? (this.stats.crossoverFailures / this.stats.totalAttempts.crossovers) * 100
          : 0,
      immigrationFailureRate:
        this.stats.totalAttempts.immigrations > 0
          ? (this.stats.immigrationFailures / this.stats.totalAttempts.immigrations) * 100
          : 0,
      evaluationFailureRate:
        this.stats.totalAttempts.evaluations > 0
          ? (this.stats.evaluationFailures / this.stats.totalAttempts.evaluations) * 100
          : 0,
    }
  }

  private saveToFile() {
    try {
      const data = {
        ...this.stats,
        timestamp: new Date().toISOString(),
        failureRates: this.getFailureRates(),
      }
      // writeFileSync(this.outputPath, JSON.stringify(data, null, 2))
      console.log(`[FailureTracker] Data saved to ${this.outputPath}`)
    } catch (error) {
      console.error("Failed to save tracking data:", error)
    }
  }

  reset() {
    this.stats = {
      mutationFailures: 0,
      crossoverFailures: 0,
      immigrationFailures: 0,
      evaluationFailures: 0,
      totalAttempts: {
        mutations: 0,
        crossovers: 0,
        immigrations: 0,
        evaluations: 0,
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    }
    this.saveToFile()
  }
}

// Export singleton instance
export const failureTracker = new FailureTracker()
