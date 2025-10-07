/**
 * Core types for model orchestrator
 * Designed to work seamlessly with Vercel AI SDK
 */

import type { LanguageModel } from "ai"

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ProviderConfig {
  /** Provider identifier (openai, anthropic, openrouter, local, etc.) */
  id: string

  /** Base URL for the provider API */
  baseUrl?: string

  /** API key (if required) */
  apiKey?: string

  /** Maximum concurrent requests to this provider */
  maxConcurrent?: number

  /** Request timeout in milliseconds */
  timeout?: number

  /** Whether this provider is enabled */
  enabled?: boolean

  /** Custom headers */
  headers?: Record<string, string>
}

// ============================================================================
// Execution Strategy
// ============================================================================

export type ExecutionStrategy =
  /** Use the first provider in the list */
  | "first"
  /** Race multiple providers, return fastest */
  | "race"
  /** Call all providers, return best based on criteria */
  | "consensus"
  /** Try providers in sequence until one succeeds */
  | "fallback"

// ============================================================================
// Model Specification
// ============================================================================

export interface ModelSpec {
  /** Provider ID */
  provider: string

  /** Model identifier */
  model: string

  /** Optional configuration overrides */
  config?: Partial<ProviderConfig>
}

// ============================================================================
// Models Config
// ============================================================================

export interface ModelsConfig {
  /** Available providers */
  providers: Record<string, ProviderConfig>

  /** Model tiers (optional) */
  tiers?: Record<string, TierConfig>

  /** Default tier to use */
  defaultTier?: string

  /** Enable performance tracking */
  trackPerformance?: boolean

  /** Enable cost tracking */
  trackCost?: boolean
}

export interface TierConfig {
  /** Execution strategy */
  strategy: ExecutionStrategy

  /** List of model specifications */
  models: ModelSpec[]

  /** Timeout for this tier in milliseconds */
  timeout?: number

  /** Maximum cost per request in USD */
  maxCost?: number
}

// ============================================================================
// Metrics
// ============================================================================

export interface ProviderMetrics {
  /** Provider ID */
  provider: string

  /** Model ID */
  model: string

  /** Total requests */
  requests: number

  /** Successful requests */
  successes: number

  /** Failed requests */
  failures: number

  /** Average latency in milliseconds */
  avgLatency: number

  /** P95 latency in milliseconds */
  p95Latency: number

  /** Total cost in USD */
  totalCost: number

  /** Last update timestamp */
  updatedAt: number
}

// ============================================================================
// Execution Context
// ============================================================================

export interface ExecutionContext {
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
// Model Result
// ============================================================================

export interface ModelResult<T = unknown> {
  /** The actual result */
  data: T

  /** Which provider was used */
  provider: string

  /** Which model was used */
  model: string

  /** Execution metrics */
  metrics: {
    latency: number
    cost?: number
    tokenUsage?: {
      input: number
      output: number
      cached?: number
    }
  }

  /** Fallback information (if fallback was used) */
  fallback?: {
    attempted: string[]
    reason: string
  }
}

// ============================================================================
// AI SDK Integration Types
// ============================================================================

/**
 * Type for AI SDK compatible models
 * In AI SDK v5+, LanguageModel is a union of LanguageModelV1 | LanguageModelV2
 */
export type AiSdkModel = LanguageModel

/**
 * Model factory function that returns an AI SDK compatible model
 */
export type ModelFactory = (spec: ModelSpec) => Promise<AiSdkModel>
