// ============================================================================
// Execution Context
// ============================================================================

export interface LLMSettingsExecutionContext {
  /** Request ID for tracing */
  requestId: string

  /** User ID (for user-specific configs) */
  userId?: string

  /** Experiment name (for A/B testing) */
  experiment?: string

  /** Custom metadata */
  metadata?: Record<string, unknown>
}

// ============================================================================
// AI SDK Integration Types
// ============================================================================

/**
 * Model type definitions and pricing data
 * Pure types and constants without runtime dependencies
 */

/* ───────── MODEL SELECTION ───────── */
// Simplified to use strings everywhere. Runtime validation handles correctness.

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cachedInputTokens?: number
}

export const TIER_NAMES = [
  "nano",
  "low",
  "balanced",
  "high",
  "default",
  "fitness",
  "reasoning",
  "summary",
  "fallback",
] as const

// @deprecated This file is deprecated. Use packages/shared/src/contracts/llm-contracts/models.ts instead.
export type TierNameOld = (typeof TIER_NAMES)[number]

export type StandardModels = {
  summary: string
  nano: string
  low: string
  balanced: string
  high: string
  default: string
  fitness: string
  reasoning: string
  fallback: string
}
