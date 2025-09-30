/**
 * Rate limiter for AI API requests.
 *
 * Uses Bottleneck to enforce concurrency and rate limits for AI model calls,
 * preventing API quota exhaustion and managing request throughput.
 *
 * Configuration:
 * - maxConcurrent: Maximum simultaneous AI requests
 * - reservoir: Token bucket size for rate limiting
 * - reservoirRefreshInterval: Time window for rate limit (ms)
 * - reservoirRefreshAmount: Tokens restored per interval
 *
 * @module messages/api/rateLimiter
 */

import { CONFIG } from "@core/core-config/compat"
import Bottleneck from "bottleneck"

/**
 * Global rate limiter instance for AI API requests.
 *
 * @remarks
 * Configured via CONFIG.limits with:
 * - maxConcurrentAIRequests: Parallel request limit
 * - maxRequestsPerWindow: Requests allowed per time window
 * - rateWindowMs: Time window duration in milliseconds
 *
 * @example
 * // Use with any AI API call
 * await limiter.schedule(() => callAIModel(prompt))
 */
export const limiter = new Bottleneck({
  maxConcurrent: CONFIG.limits.maxConcurrentAIRequests,
  reservoir: CONFIG.limits.maxRequestsPerWindow,
  reservoirRefreshInterval: CONFIG.limits.rateWindowMs,
  reservoirRefreshAmount: CONFIG.limits.maxRequestsPerWindow,
})
