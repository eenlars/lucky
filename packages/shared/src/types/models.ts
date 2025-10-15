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

/**
 * Standard model tier configuration.
 * All model names are strings, validated at runtime.
 */
export type StandardModels = {
  summary: string
  nano: string
  low: string
  medium: string
  high: string
  default: string
  fitness: string
  reasoning: string
  fallback: string
}
