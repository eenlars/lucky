/**
 * Configuration schema types for user YAML configs
 * Minimal but expressive configuration format
 */

import type { ExecutionStrategy } from "./index"

// ============================================================================
// User Configuration (YAML Schema)
// ============================================================================

export interface UserConfig {
  /** Configuration name */
  name: string

  /** Named experiments */
  experiments?: Record<string, ExperimentConfig>

  /** Default experiment to use */
  defaults?: {
    experiment?: string
    maxConcurrent?: number
    timeout?: number
    costLimit?: number
  }

  /** Performance tracking settings */
  performanceTracking?: boolean
}

export interface ExperimentConfig {
  /** Execution strategy */
  strategy: ExecutionStrategy

  /** Provider/model strings (e.g., "openai/gpt-4", "local/llama-3") */
  providers: string[]

  /** Optional timeout override */
  timeout?: number

  /** Optional cost limit */
  maxCost?: number
}

// ============================================================================
// Config Resolution
// ============================================================================

export interface ResolvedConfig {
  /** Selected experiment */
  experiment: string

  /** Resolved execution strategy */
  strategy: ExecutionStrategy

  /** Resolved provider specs */
  providers: Array<{
    provider: string
    model: string
  }>

  /** Resolved timeout */
  timeout: number

  /** Resolved cost limit */
  maxCost?: number
}
