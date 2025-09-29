/**
 * Model fallback system for handling AI model failures.
 *
 * This module provides automatic fallback mechanisms when AI models
 * experience timeouts or failures. It tracks model performance and
 * switches to backup models when necessary to maintain service reliability.
 *
 * @module sendAI/fallbacks
 */

// TODO: implement configurable fallback chains (primary -> secondary -> tertiary)
// TODO: add fallback decision based on error types, not just timeouts
// TODO: implement model health scoring beyond timeout counting
// TODO: add fallback cost optimization (prefer cheaper models)
// TODO: create fallback performance metrics and reporting
// TODO: implement circuit breaker pattern for model failures
// TODO: add model recovery detection to restore primary models
// TODO: create per-operation fallback strategies (tools vs text vs structured)

import type { ModelName } from "@core/utils/spending/models.types"
import { getDefaultModels } from "@runtime/settings/models"

/**
 * Tracks timeout timestamps for each model.
 * Uses a rolling window to maintain recent performance history.
 */
// TODO: implement persistent storage for fallback state across restarts
// TODO: add timeout categorization (network vs model vs rate limit)
// TODO: optimize memory usage by cleaning old entries
const modelTimeouts = new Map<ModelName, number[]>()

/**
 * Time window for tracking model timeouts (30 seconds).
 * Timeouts outside this window are not considered for fallback decisions.
 */
// TODO: make timeout window configurable per environment
// TODO: implement different windows for different failure types
const TIMEOUT_WINDOW_MS = 30_000 // 30 s rolling window

/**
 * Gets the current timeout count for a model within the tracking window.
 *
 * Only counts timeouts that occurred within the configured time window
 * to provide recent model performance information.
 *
 * @param model - The model to check timeout count for
 * @returns Number of recent timeouts for the model
 */
// TODO: add timeout severity weighting
// TODO: implement timeout trend analysis
// TODO: add model performance comparison metrics
export function getModelTimeoutCount(model: ModelName): number {
  const now = Date.now()
  return (modelTimeouts.get(model) || []).filter((t) => now - t <= TIMEOUT_WINDOW_MS).length
}

/**
 * Determines if a model should use its fallback based on recent failures.
 *
 * Switches to fallback when timeout count exceeds threshold, unless
 * the current model is already the fallback model.
 *
 * @param model - The model to evaluate for fallback
 * @returns True if fallback should be used, false otherwise
 */
// TODO: make threshold configurable per model
// TODO: add contextual fallback (different thresholds for different operations)
// TODO: implement weighted scoring instead of simple count
export function shouldUseModelFallback(model: ModelName): boolean {
  return getModelTimeoutCount(model) >= 10 && model !== getDefaultModels().fallback
}

/**
 * Gets the fallback model to use when primary model fails.
 *
 * Currently returns the configured fallback model from settings.
 * In the future, this could implement intelligent fallback selection.
 *
 * @param model - The original model that needs fallback (unused currently)
 * @returns The fallback model to use
 */
// TODO: implement intelligent fallback selection based on capabilities
// TODO: add fallback model rotation to distribute load
// TODO: consider cost and performance trade-offs in fallback selection
export function getFallbackModel(model: ModelName): ModelName {
  return getDefaultModels().fallback
}

/**
 * Records a timeout event for a model in the tracking system.
 *
 * Adds the current timestamp to the model's timeout history for
 * use in future fallback decisions.
 *
 * @param model - The model that experienced a timeout
 */
// TODO: add timeout context information (error type, duration, etc.)
// TODO: implement timeout event aggregation and batching
// TODO: add timeout event persistence for analysis
export function trackTimeoutForModel(model: ModelName): void {
  const now = Date.now()
  const existing = modelTimeouts.get(model) ?? []
  existing.push(now)
  modelTimeouts.set(model, existing)
}
