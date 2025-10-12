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

import { getCoreConfig } from "@core/core-config/coreConfig"
import Bottleneck from "bottleneck"

/**
 * Global rate limiter instance for AI API requests.
 *
 * @remarks
 * Configured via getCoreConfig().limits with:
 * - maxConcurrentAIRequests: Parallel request limit
 * - maxRequestsPerWindow: Requests allowed per time window
 * - rateWindowMs: Time window duration in milliseconds
 *
 * @example
 * // Use with any AI API call
 * await limiter.schedule(() => callAIModel(prompt))
 */
export const limiter = new Bottleneck({
  maxConcurrent: getCoreConfig().limits.maxConcurrentAIRequests,
  reservoir: getCoreConfig().limits.maxRequestsPerWindow,
  reservoirRefreshInterval: getCoreConfig().limits.rateWindowMs,
  reservoirRefreshAmount: getCoreConfig().limits.maxRequestsPerWindow,
})
