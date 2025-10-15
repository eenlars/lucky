/**
 * Production Configuration Example
 *
 * Optimized for production use with reliability, fallbacks, and cost control.
 * This config demonstrates a robust production setup.
 */

import { defineConfig } from "../src/config/define"

export default defineConfig({
  name: "Production Config",

  experiments: {
    // Primary production endpoint - fast and reliable
    production: {
      strategy: "fallback",
      providers: ["openrouter"],
      timeout: 30000,
      maxCost: 0.15,
    },

    // High-priority requests - best quality
    priority: {
      strategy: "fallback",
      providers: ["openrouter"],
      timeout: 60000,
      maxCost: 1.0,
    },

    // Batch processing - optimize for cost
    batch: {
      strategy: "first",
      providers: ["openrouter"],
      timeout: 45000,
      maxCost: 0.01,
    },

    // Emergency fallback - maximum reliability
    emergency: {
      strategy: "fallback",
      providers: ["openrouter"],
      timeout: 90000,
      maxCost: 0.2,
    },
  },

  defaults: {
    experiment: "production",
    maxConcurrent: 100,
    timeout: 30000,
    costLimit: 500.0, // $500 daily limit
  },

  performanceTracking: true,
})
