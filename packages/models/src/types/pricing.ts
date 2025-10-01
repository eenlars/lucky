/**
 * Pricing types for automatic pricing updates
 */

// ============================================================================
// Pricing Data
// ============================================================================

export interface ModelPricing {
  /** Provider ID */
  provider: string

  /** Model ID */
  model: string

  /** Input price per million tokens (USD) */
  inputPerMillion: number

  /** Output price per million tokens (USD) */
  outputPerMillion: number

  /** Cached input price per million tokens (USD) */
  cachedInputPerMillion?: number

  /** Last updated timestamp */
  updatedAt: number

  /** Data source */
  source: "api" | "manual" | "fallback"
}

// ============================================================================
// Pricing Provider Interface
// ============================================================================

export interface PricingProvider {
  /** Provider identifier */
  id: string

  /** Fetch latest pricing data */
  fetchPricing(): Promise<ModelPricing[]>

  /** Check if provider is available */
  isAvailable(): Promise<boolean>
}

// ============================================================================
// Pricing Cache
// ============================================================================

export interface PricingCache {
  /** All pricing data */
  models: Record<string, ModelPricing>

  /** Cache metadata */
  metadata: {
    lastUpdate: number
    version: string
  }
}
