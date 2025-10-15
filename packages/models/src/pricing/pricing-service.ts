/**
 * Pricing Service - Manages model pricing with versioning and snapshots
 *
 * Responsibilities:
 * - Serve current pricing data
 * - Create immutable snapshots for billing
 * - Apply manual pricing overrides
 * - (Future) Fetch dynamic pricing from provider APIs
 *
 * @module pricing/pricing-service
 */

import type { ModelEntry } from "@lucky/shared"
import { MODEL_CATALOG } from "./catalog"

/**
 * Immutable pricing snapshot for billing and auditability
 *
 * Each request/job should capture a snapshot at execution time to ensure
 * pricing consistency even if catalog updates later.
 */
export interface PricingSnapshot {
  /** Unique version identifier (timestamp or git sha) */
  version: string

  /** When this snapshot was created */
  timestamp: number

  /** Complete model catalog at snapshot time */
  models: ModelEntry[]

  /** How this snapshot was created */
  source: "manual" | "catalog" | "fetched"

  /** Optional metadata */
  metadata?: {
    gitSha?: string
    environment?: string
    triggeredBy?: string
  }
}

/**
 * Pricing override for specific model
 *
 * Allows manual adjustment of pricing without changing the catalog.
 * Useful for: discounts, promotions, experiments, cost adjustments.
 */
export interface PricingOverride {
  modelId: string
  input?: number
  output?: number
  cachedInput?: number | null
  active?: boolean
  reason?: string
  expiresAt?: number
}

/**
 * Service for managing model pricing
 */
export class PricingService {
  private currentSnapshot: PricingSnapshot
  private overrides: Map<string, PricingOverride>

  constructor() {
    // Initialize with catalog snapshot
    this.currentSnapshot = this.createSnapshotFromCatalog()
    this.overrides = new Map()
  }

  /**
   * Get current pricing for a specific model
   *
   * Applies overrides if present, otherwise returns catalog pricing.
   *
   * @param modelId - Full model ID (e.g., "openrouter#openai/gpt-4o-mini")
   * @returns Model entry with current pricing, or null if not found
   */
  getPrice(modelId: string): ModelEntry | null {
    // Find base entry
    const baseEntry = this.currentSnapshot.models.find(m => m.id === modelId)
    if (!baseEntry) {
      return null
    }

    // Apply overrides if present
    const override = this.overrides.get(modelId)
    if (!override) {
      return baseEntry
    }

    // Check if override expired
    if (override.expiresAt && Date.now() > override.expiresAt) {
      this.overrides.delete(modelId)
      return baseEntry
    }

    // Merge override with base entry
    return {
      ...baseEntry,
      input: override.input ?? baseEntry.input,
      output: override.output ?? baseEntry.output,
      cachedInput: override.cachedInput !== undefined ? override.cachedInput : baseEntry.cachedInput,
      active: override.active !== undefined ? override.active : baseEntry.active,
    }
  }

  /**
   * Get all available models with current pricing
   *
   * @param activeOnly - If true, only return active models
   */
  listModels(activeOnly = true): ModelEntry[] {
    const models = this.currentSnapshot.models.map(m => this.getPrice(m.id)).filter(Boolean) as ModelEntry[]

    return activeOnly ? models.filter(m => m.active) : models
  }

  /**
   * Create immutable snapshot for billing/audit
   *
   * This snapshot represents pricing at a point in time and should never change.
   * Store this with job/request metadata for accurate cost calculation later.
   *
   * @returns Immutable pricing snapshot
   */
  createSnapshot(): PricingSnapshot {
    return {
      version: this.generateVersion(),
      timestamp: Date.now(),
      models: this.listModels(false), // Include inactive for completeness
      source: "catalog",
      metadata: {
        environment: process.env.NODE_ENV,
      },
    }
  }

  /**
   * Set manual pricing override
   *
   * @param override - Pricing override configuration
   */
  setOverride(override: PricingOverride): void {
    this.overrides.set(override.modelId, override)
  }

  /**
   * Remove pricing override
   *
   * @param modelId - Model to remove override for
   */
  removeOverride(modelId: string): void {
    this.overrides.delete(modelId)
  }

  /**
   * Get all active overrides
   */
  getOverrides(): PricingOverride[] {
    return Array.from(this.overrides.values())
  }

  /**
   * Clear all overrides
   */
  clearOverrides(): void {
    this.overrides.clear()
  }

  /**
   * Refresh pricing from catalog
   *
   * Updates the current snapshot to latest catalog data.
   * Useful when catalog is updated externally.
   */
  refresh(): void {
    this.currentSnapshot = this.createSnapshotFromCatalog()
  }

  /**
   * Calculate cost for token usage
   *
   * @param modelId - Model ID
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param cachedTokens - Number of cached input tokens (optional)
   * @returns Cost in USD
   */
  calculateCost(modelId: string, inputTokens: number, outputTokens: number, cachedTokens?: number): number | null {
    const pricing = this.getPrice(modelId)
    if (!pricing) {
      return null
    }

    // Calculate base cost
    let cost = (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000

    // Add cached token cost if applicable
    if (cachedTokens && pricing.cachedInput !== null) {
      // Subtract regular input cost for cached tokens, add cached cost
      cost -= (cachedTokens * pricing.input) / 1_000_000
      cost += (cachedTokens * pricing.cachedInput) / 1_000_000
    }

    return Number(cost.toFixed(8))
  }

  /**
   * Get current snapshot version
   */
  getCurrentVersion(): string {
    return this.currentSnapshot.version
  }

  /**
   * Get statistics about current pricing
   */
  getStats() {
    const models = this.listModels(false)
    const active = models.filter(m => m.active)

    return {
      total: models.length,
      active: active.length,
      overrides: this.overrides.size,
      version: this.currentSnapshot.version,
      timestamp: this.currentSnapshot.timestamp,
      byProvider: {
        openai: active.filter(m => m.provider === "openai").length,
        openrouter: active.filter(m => m.provider === "openrouter").length,
        groq: active.filter(m => m.provider === "groq").length,
      },
    }
  }

  // ============================================================================
  // Future: Dynamic Pricing
  // ============================================================================

  /**
   * Fetch pricing from provider APIs (placeholder for future implementation)
   *
   * This will:
   * 1. Query each provider's pricing API
   * 2. Normalize to our format
   * 3. Update catalog with fetched data
   * 4. Preserve manual overrides
   * 5. Create new snapshot
   *
   * @throws Not yet implemented
   */
  async fetchDynamicPricing(): Promise<void> {
    throw new Error("Dynamic pricing fetching not yet implemented. See packages/models/scripts/fetch-pricing.ts")
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Create snapshot from current catalog
   */
  private createSnapshotFromCatalog(): PricingSnapshot {
    return {
      version: this.generateVersion(),
      timestamp: Date.now(),
      models: [...MODEL_CATALOG], // Clone to prevent mutation
      source: "catalog",
    }
  }

  /**
   * Generate version identifier
   *
   * Uses timestamp for now. In production, could use:
   * - Git SHA
   * - Semantic version
   * - UUID
   */
  private generateVersion(): string {
    return `v${Date.now()}`
  }
}

/**
 * Singleton pricing service instance
 *
 * Use this for consistent pricing access across the application.
 */
let pricingServiceInstance: PricingService | null = null

/**
 * Get or create the singleton pricing service
 */
export function getPricingService(): PricingService {
  if (!pricingServiceInstance) {
    pricingServiceInstance = new PricingService()
  }
  return pricingServiceInstance
}

/**
 * Reset pricing service (useful for testing)
 */
export function resetPricingService(): void {
  pricingServiceInstance = null
}
