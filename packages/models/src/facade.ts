/**
 * Models Facade - Stable public API for model operations
 *
 * This is the ONLY interface consumers should use. It provides:
 * - Model selection with policy enforcement
 * - Cost estimation and budget management
 * - Fallback strategies
 * - Observability (every call tagged with metadata)
 *
 * Design principles:
 * - Small, stable surface (minimize breaking changes)
 * - Composable options (withBudget, withFallback)
 * - Explicit reasoning (why was this model chosen?)
 * - Immutable snapshots (pricing at selection time)
 *
 * @module facade
 */

import type { ModelEntry, ModelSelection } from "@lucky/shared"
import type { LanguageModel } from "ai"
import { getModelsInstance } from "./models-instance"
import { getLogger, withPerformanceLogging } from "./observability/logger"
import { MODEL_CATALOG } from "./pricing/catalog"
import { getPricingService } from "./pricing/pricing-service"
import { getRegistry } from "./registry/model-registry"
import { getSelector } from "./selector/policy-selector"

/**
 * Options for model selection
 *
 * These constraints and preferences guide the policy selector.
 */
export interface SelectionOptions {
  // ========== Constraints (hard limits) ==========

  /** Maximum cost per 1M tokens (combined input+output) */
  budget?: number

  /** Maximum acceptable latency tier */
  maxLatency?: "fast" | "medium" | "slow"

  /** Required features (all must be present) */
  requiredFeatures?: Array<"tools" | "json-mode" | "streaming" | "vision">

  /** Minimum context window size */
  minContextLength?: number

  /** Minimum intelligence level (1-10) */
  minIntelligence?: number

  // ========== Preferences (soft hints) ==========

  /** Preferred providers (ordered by preference) */
  preferredProviders?: string[]

  /** Fallback strategy if primary fails */
  fallbackStrategy?: "cheapest" | "fastest" | "semantic" | "none"

  /** Optimize for cost vs performance */
  optimizeFor?: "cost" | "speed" | "quality" | "balanced"

  // ========== Policy & Safety ==========

  /** Only allow these models (allowlist) */
  allowlist?: string[]

  /** Never use these models (denylist) */
  denylist?: string[]

  /** Maximum spend per request (USD) */
  maxSpendPerRequest?: number

  // ========== Observability ==========

  /** User/tenant ID for tracking */
  userId?: string

  /** Request ID for tracing */
  requestId?: string

  /** Additional metadata */
  metadata?: Record<string, unknown>
}

/**
 * Facade - Main public API for model operations
 *
 * This class integrates all core components (Registry, Selector, PricingService, Logger)
 * to provide robust, intelligent, and observable model operations.
 */
export class ModelsFacade {
  private pricing = getPricingService()
  private models = getModelsInstance()
  private registry = getRegistry(MODEL_CATALOG)
  private selector = getSelector(this.registry)
  private logger = getLogger()

  /**
   * Resolve model by intent or tier name (INTELLIGENT SELECTION)
   *
   * This is the primary method for model selection. It applies all policies,
   * constraints, and preferences to select the best model.
   *
   * @param intent - Model intent/tier ("high", "low", "reasoning") or explicit ID
   * @param options - Selection constraints and preferences
   * @returns Selected model with metadata
   *
   * @example
   * ```ts
   * const selection = await facade.resolve("high", {
   *   budget: 5.0,
   *   requiredFeatures: ["tools", "json-mode"],
   *   preferredProviders: ["openai", "openrouter"]
   * })
   * ```
   */
  async resolve(intent: string, options: SelectionOptions = {}): Promise<ModelSelection> {
    const startTime = Date.now()

    try {
      // Use policy selector for intelligent selection
      const result = this.selector.select(intent, options)

      if (!result) {
        throw new Error(`No model found matching intent: ${intent} with options: ${JSON.stringify(options)}`)
      }

      const { model, reason } = result

      // Build ModelSelection
      const selection: ModelSelection = {
        modelId: model.id,
        provider: model.provider,
        model: model.model,
        reason: reason.primary,
        priceVersion: this.pricing.getCurrentVersion(),
        inputCostPer1M: model.input,
        outputCostPer1M: model.output,
        capabilities: {
          contextLength: model.contextLength,
          supportsTools: model.supportsTools,
          supportsJsonMode: model.supportsJsonMode,
          supportsStreaming: model.supportsStreaming,
          supportsVision: model.supportsVision,
          supportsReasoning: model.supportsReasoning,
          supportsAudio: model.supportsAudio,
          supportsVideo: model.supportsVideo,
        },
        performance: {
          speed: model.speed,
          intelligence: model.intelligence,
        },
        alternatives: reason.alternatives,
        timestamp: Date.now(),
      }

      // Log selection
      this.logger.logSelection({
        modelId: selection.modelId,
        provider: selection.provider,
        priceVersion: selection.priceVersion,
        reason,
        intent,
        options,
        durationMs: Date.now() - startTime,
        userId: options.userId,
        requestId: options.requestId,
        metadata: options.metadata,
      })

      return selection
    } catch (error) {
      // Log error
      this.logger.logError(error as Error, {
        event: "selection_error",
        intent,
        options,
        userId: options.userId,
        requestId: options.requestId,
      })
      throw error
    }
  }

  /**
   * List available models
   *
   * @param filters - Optional filters
   * @returns Array of model entries
   *
   * @example
   * ```ts
   * const fastModels = facade.list({
   *   speed: "fast",
   *   minContextLength: 100000
   * })
   * ```
   */
  list(filters?: {
    provider?: string
    minContextLength?: number
    speed?: "fast" | "medium" | "slow"
    maxCost?: number
  }): ModelEntry[] {
    return this.registry.list({
      provider: filters?.provider,
      minContextLength: filters?.minContextLength,
      speed: filters?.speed,
      maxAvgCost: filters?.maxCost,
      activeOnly: true,
    })
  }

  /**
   * Calculate cost for specific token usage
   *
   * @param modelId - Model ID
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @param cachedTokens - Number of cached input tokens (optional)
   * @returns Cost in USD
   *
   * @example
   * ```ts
   * const cost = facade.costOf("openrouter#openai/gpt-4o-mini", 1000, 500)
   * console.log(`Cost: $${cost}`)
   * ```
   */
  costOf(modelId: string, inputTokens: number, outputTokens: number, cachedTokens?: number): number {
    const cost = this.pricing.calculateCost(modelId, inputTokens, outputTokens, cachedTokens)
    if (cost === null) {
      throw new Error(`Model not found: ${modelId}`)
    }

    // Log cost calculation
    const model = this.pricing.getPrice(modelId)
    if (model) {
      const inputCost = (inputTokens * model.input) / 1_000_000
      const outputCost = (outputTokens * model.output) / 1_000_000
      const cachedCost =
        cachedTokens && model.cachedInput !== null ? (cachedTokens * model.cachedInput) / 1_000_000 : undefined

      this.logger.logCost({
        modelId,
        provider: model.provider,
        priceVersion: this.pricing.getCurrentVersion(),
        inputTokens,
        outputTokens,
        cachedTokens,
        inputCost,
        outputCost,
        cachedCost,
        totalCost: cost,
      })
    }

    return cost
  }

  /**
   * Select model within budget
   *
   * @param maxCost - Maximum cost per 1M tokens
   * @param options - Additional selection options
   * @returns Selected model within budget
   *
   * @example
   * ```ts
   * const selection = await facade.withBudget(1.0, {
   *   minIntelligence: 7,
   *   requiredFeatures: ["tools"]
   * })
   * ```
   */
  async withBudget(maxCost: number, options?: SelectionOptions): Promise<ModelSelection> {
    return this.resolve("default", {
      ...options,
      budget: maxCost,
      optimizeFor: "cost",
    })
  }

  /**
   * Select model with fallback chain
   *
   * Tries primary first, falls back to alternatives if primary fails.
   *
   * @param primary - Primary model ID or tier
   * @param fallbacks - Fallback model IDs (in order)
   * @param options - Additional selection options
   * @returns Selected model (primary or fallback)
   *
   * @example
   * ```ts
   * const selection = await facade.withFallback(
   *   "openrouter#openai/gpt-4o",
   *   ["openrouter#openai/gpt-4o-mini", "openrouter#openai/gpt-3.5-turbo"]
   * )
   * ```
   */
  async withFallback(primary: string, fallbacks: string[], options?: SelectionOptions): Promise<ModelSelection> {
    try {
      return await this.resolve(primary, options)
    } catch (primaryError) {
      // Try each fallback
      for (const fallback of fallbacks) {
        try {
          const selection = await this.resolve(fallback, options)

          // Log fallback
          this.logger.logFallback({
            primaryModelId: primary,
            fallbackModelId: selection.modelId,
            reason: (primaryError as Error).message,
            userId: options?.userId,
            requestId: options?.requestId,
          })

          // Update reason
          selection.reason = `Fallback from ${primary}: ${(primaryError as Error).message}`
          selection.alternatives = [primary, ...(selection.alternatives || [])]

          return selection
        } catch {}
      }

      // All fallbacks failed
      throw new Error(`All fallbacks exhausted for ${primary}. Last error: ${(primaryError as Error).message}`)
    }
  }

  /**
   * Get actual AI SDK model instance
   *
   * Use this to get the LanguageModel for AI SDK functions like generateText.
   *
   * @param selection - Model selection from resolve()
   * @returns AI SDK LanguageModel
   *
   * @example
   * ```ts
   * const selection = await facade.resolve("high")
   * const model = await facade.getModel(selection)
   * const result = await generateText({ model, prompt: "..." })
   * ```
   */
  async getModel(selection: ModelSelection): Promise<LanguageModel> {
    return withPerformanceLogging(
      "getModel",
      async () => {
        return this.models.model({
          provider: selection.provider,
          model: selection.model,
        })
      },
      {
        modelId: selection.modelId,
        provider: selection.provider,
      },
    )
  }

  /**
   * Get facade statistics
   */
  getStats() {
    return {
      pricing: this.pricing.getStats(),
      registry: this.registry.getStats(),
      timestamp: Date.now(),
    }
  }

  /**
   * Configure logger
   */
  configureLogger(config: Record<string, unknown>): void {
    this.logger.configure(config)
  }
}

/**
 * Singleton facade instance
 */
let facadeInstance: ModelsFacade | null = null

/**
 * Get or create the singleton facade
 *
 * @example
 * ```ts
 * import { getFacade } from "@lucky/models/facade"
 *
 * const facade = getFacade()
 * const selection = await facade.resolve("high")
 * ```
 */
export function getFacade(): ModelsFacade {
  if (!facadeInstance) {
    facadeInstance = new ModelsFacade()
  }
  return facadeInstance
}

/**
 * Reset facade instance (for testing)
 */
export function resetFacade(): void {
  facadeInstance = null
}
