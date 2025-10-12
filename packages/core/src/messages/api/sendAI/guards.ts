/**
 * Guard functions for controlling AI API access.
 *
 * This module provides rate limiting and spending control mechanisms
 * to prevent excessive API usage and cost overruns. Guards are applied
 * before every AI request to ensure safe operation.
 *
 * @module sendAI/guards
 */

// TODO: implement distributed rate limiting for multi-instance deployments
// TODO: add configurable rate limit strategies (sliding window, token bucket)
// TODO: implement request prioritization and queue management
// TODO: add spending forecasting and alerting
// TODO: create guard bypass mechanisms for emergency operations
// TODO: implement adaptive rate limiting based on model performance
// TODO: add guard metrics and monitoring dashboards
// TODO: create guard rule templates for different environments

import { getCoreConfig } from "@core/core-config/coreConfig"
import { SpendingTracker } from "@core/utils/spending/SpendingTracker"

const spending = SpendingTracker.getInstance()

/**
 * Tracks request timestamps for rate limiting.
 * Uses a sliding window approach to maintain accurate request counts.
 */
// TODO: implement persistent rate limit storage for server restarts
// TODO: add per-user or per-API-key rate limiting
// TODO: optimize memory usage for long-running applications
const hitTimestamps: number[] = []

/**
 * Enforces rate limits on AI API requests.
 *
 * Uses a sliding window algorithm to track request frequency and
 * prevents exceeding configured request limits within the time window.
 *
 * @returns Error message if rate limit exceeded, null if allowed
 */
// TODO: add rate limit headers for client-side throttling
// TODO: implement exponential backoff recommendations
// TODO: add rate limit exemptions for critical operations
export function rateLimit(): string | null {
  const config = getCoreConfig()
  const RATE_WINDOW_MS = config.limits.rateWindowMs
  const MAX_REQUESTS_PER_WINDOW = config.limits.maxRequestsPerWindow
  const now = Date.now()

  // remove expired timestamps from sliding window
  while (hitTimestamps.length && now - hitTimestamps[0] > RATE_WINDOW_MS) hitTimestamps.shift()

  if (hitTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return `sendAI: Rate limit exceeded: ${MAX_REQUESTS_PER_WINDOW} req / ${RATE_WINDOW_MS} ms`
  }

  hitTimestamps.push(now)
  return null
}

/**
 * Enforces spending limits on AI API requests.
 *
 * Checks against configured spending thresholds to prevent cost overruns.
 * Can be disabled in configuration for unlimited spending environments.
 *
 * @returns Error message if spending limit exceeded, null if allowed
 */
// TODO: implement spending alerts before limits are reached
// TODO: add spending rollover for monthly/daily budgets
// TODO: create spending limit escalation workflows
// TODO: add cost prediction based on request complexity
export function spendingGuard(): string | null {
  if (!getCoreConfig().limits.enableSpendingLimits) return null
  if (spending.canMakeRequest()) return null

  const { currentSpend, spendingLimit } = spending.getStatus()
  return `Spending limit exceeded: $${currentSpend.toFixed(2)} / $${spendingLimit.toFixed(2)}`
}
