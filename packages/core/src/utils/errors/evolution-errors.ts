/**
 * Evolution and genetic programming error types.
 */

import { EnhancedError } from "./enhanced-error"

/**
 * Thrown when population operations fail due to insufficient genomes.
 */
export class PopulationError extends EnhancedError {
  constructor(
    message: string,
    context?: {
      currentSize?: number
      requiredSize?: number
      operation?: string
      suggestion?: string
    },
  ) {
    super({
      title: "Population Error",
      message,
      action: context?.suggestion
        ? context.suggestion
        : "Increase the population size or adjust filtering criteria to maintain sufficient genomes.",
      debug: {
        code: "POPULATION_ERROR",
        context: context || {},
        timestamp: new Date().toISOString(),
      },
      docsUrl: "/docs/evolution/population",
      retryable: true,
      retryStrategy: "manual",
    })
    this.name = "PopulationError"
  }
}

/**
 * Thrown when run/generation tracking fails.
 */
export class RunTrackingError extends EnhancedError {
  constructor(
    message: string,
    context?: {
      runId?: string
      generationId?: string
      operation?: string
    },
  ) {
    super({
      title: "Run Tracking Error",
      message,
      action: "Ensure the run/generation was created properly before accessing it. Check the workflow execution flow.",
      debug: {
        code: "RUN_TRACKING_ERROR",
        context: context || {},
        timestamp: new Date().toISOString(),
      },
      retryable: false,
    })
    this.name = "RunTrackingError"
  }
}

/**
 * Thrown when crossover/genetic operations fail.
 */
export class GeneticOperationError extends EnhancedError {
  constructor(
    operation: string,
    message: string,
    context?: {
      parentCount?: number
      requiredParents?: number
      details?: Record<string, unknown>
    },
  ) {
    super({
      title: `${operation} Failed`,
      message,
      action: "Ensure sufficient parents are available and meet the requirements for the genetic operation.",
      debug: {
        code: "GENETIC_OPERATION_ERROR",
        context: { operation, ...context },
        timestamp: new Date().toISOString(),
      },
      retryable: true,
      retryStrategy: "manual",
    })
    this.name = "GeneticOperationError"
  }
}
