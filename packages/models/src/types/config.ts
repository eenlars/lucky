/**
 * Configuration schema types for user YAML configs
 * Minimal but expressive configuration format
 */

import type { LuckyProvider } from "@lucky/shared"
import type { ExecutionStrategy } from "./index"

// ============================================================================
// User Configuration (YAML Schema)
// ============================================================================

export interface ExperimentConfig {
  /** Execution strategy */
  strategy: ExecutionStrategy

  /** Provider strings (e.g., "openai", "groq") */
  providers: LuckyProvider[]

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
