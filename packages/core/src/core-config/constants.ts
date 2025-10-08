/**
 * Core configuration constants.
 * Centralizes all magic numbers and hard-coded values with documentation.
 */

/**
 * Evolution engine constants
 */
export const EVOLUTION_CONSTANTS = {
  /**
   * Maximum number of retries for failed evolution operations.
   * Set to 2 to allow for transient failures while preventing infinite loops.
   */
  MAX_EVOLUTION_RETRIES: 2,

  /**
   * Minimum viable population size for genetic programming.
   * Below this threshold, genetic diversity is insufficient for effective evolution.
   */
  MIN_VIABLE_POPULATION_SIZE: 4,

  /**
   * Delay in milliseconds between retry attempts.
   * Uses fixed delay; consider exponential backoff for production.
   */
  RETRY_DELAY_MS: 1000,

  /**
   * Default population size for genetic programming.
   */
  DEFAULT_POPULATION_SIZE: 20,

  /**
   * Default number of generations to run.
   */
  DEFAULT_GENERATIONS: 10,
} as const

/**
 * Memory management constants
 */
export const MEMORY_CONSTANTS = {
  /**
   * Maximum age for cached memory entries in milliseconds (1 hour).
   */
  MAX_CACHE_AGE_MS: 60 * 60 * 1000,

  /**
   * Maximum size for in-memory storage before eviction (100MB).
   */
  MAX_MEMORY_SIZE_BYTES: 100 * 1024 * 1024,

  /**
   * Chunk size for large data storage (10MB).
   */
  CHUNK_SIZE_BYTES: 10 * 1024 * 1024,
} as const

/**
 * Execution constants
 */
export const EXECUTION_CONSTANTS = {
  /**
   * Default timeout for node execution in milliseconds (5 minutes).
   */
  DEFAULT_NODE_TIMEOUT_MS: 5 * 60 * 1000,

  /**
   * Maximum depth for workflow execution to prevent infinite loops.
   */
  MAX_EXECUTION_DEPTH: 100,

  /**
   * Maximum number of messages in a single workflow execution.
   */
  MAX_MESSAGE_COUNT: 1000,
} as const

/**
 * Validation constants
 */
export const VALIDATION_CONSTANTS = {
  /**
   * Minimum token count for valid AI input.
   */
  MIN_TOKEN_COUNT: 1,

  /**
   * Maximum content length for messages (1MB).
   */
  MAX_CONTENT_LENGTH: 1024 * 1024,
} as const

/**
 * Environment configuration
 */
export const ENV_CONFIG = {
  /**
   * Base URL for workflow tracing UI.
   * Override with WORKFLOW_TRACE_URL environment variable.
   */
  TRACE_BASE_URL:
    typeof process !== "undefined"
      ? process.env.WORKFLOW_TRACE_URL || "https://flowgenerator.vercel.app/trace"
      : "https://flowgenerator.vercel.app/trace",

  /**
   * Current environment (development, staging, production).
   */
  NODE_ENV: typeof process !== "undefined" ? process.env.NODE_ENV || "development" : "development",
} as const

/**
 * Performance constants
 */
export const PERFORMANCE_CONSTANTS = {
  /**
   * Threshold for slow operation warning in milliseconds (1 second).
   */
  SLOW_OPERATION_THRESHOLD_MS: 1000,

  /**
   * Batch size for parallel operations.
   */
  PARALLEL_BATCH_SIZE: 10,
} as const
