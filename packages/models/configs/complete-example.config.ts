/**
 * Complete Models Registry Configuration Example
 *
 * This file demonstrates all features of the models registry.
 * Copy this file and customize it for your needs.
 *
 * Usage:
 *   await models.loadUserConfig('user-id', './path/to/config.ts')
 *   const model = await getModel({ model: 'user:user-id:experiment-name', userId: 'user-id' })
 */

import { defineConfig } from "../src/config/define"

export default defineConfig({
  // ============================================================================
  // Config Metadata
  // ============================================================================
  name: "Complete Example Configuration",

  // ============================================================================
  // Experiments
  // ============================================================================
  // Each experiment defines a strategy and list of providers to use.
  // Strategies:
  //   - first: Use the first provider in the list (fastest to start)
  //   - race: Race all providers, return fastest result
  //   - fallback: Try providers in order until one succeeds
  //   - consensus: Call all providers, return best result based on criteria
  experiments: {
    // Fast inference - race multiple fast models
    fast: {
      strategy: "race",
      providers: ["openrouter", "openrouter", "groq"],
      timeout: 10000, // 10 seconds
      maxCost: 0.01, // Max $0.01 per request
    },

    // Local-first - prefer local models, fallback to cloud
    local_first: {
      strategy: "fallback",
      providers: ["openrouter"],
      timeout: 30000,
      maxCost: 0.05,
    },

    // High quality - use best models
    high_quality: {
      strategy: "first",
      providers: ["openrouter"],
      timeout: 60000,
      maxCost: 1.0,
    },

    // Cost optimized - cheapest models only
    cheap: {
      strategy: "first",
      providers: ["openrouter"],
      timeout: 15000,
      maxCost: 0.001, // Max $0.001 per request
    },

    // Reasoning - models with extended thinking
    reasoning: {
      strategy: "first",
      providers: ["openrouter"],
      timeout: 120000, // 2 minutes for thinking
      maxCost: 2.0,
    },

    // Multi-provider consensus - compare outputs
    consensus: {
      strategy: "consensus",
      providers: ["openrouter"],
      timeout: 45000,
      maxCost: 0.5,
    },

    // Balanced - good mix of speed, quality, cost
    balanced: {
      strategy: "first",
      providers: ["openrouter"],
      timeout: 30000,
      maxCost: 0.1,
    },

    // Research - experimentation with multiple options
    research: {
      strategy: "race",
      providers: ["openrouter"],
      timeout: 60000,
      maxCost: 1.5,
    },

    // Fallback chain - comprehensive backup strategy
    robust: {
      strategy: "fallback",
      providers: ["openrouter"],
      timeout: 60000,
      maxCost: 0.2,
    },

    // Local development - all local models
    local_dev: {
      strategy: "race",
      providers: ["openrouter"],
      timeout: 45000,
    },
  },

  // ============================================================================
  // Default Settings
  // ============================================================================
  // Applied when no specific settings are provided in the request
  defaults: {
    // Default experiment to use when not specified
    experiment: "balanced",

    // Maximum concurrent requests
    maxConcurrent: 50,

    // Default timeout in milliseconds
    timeout: 30000,

    // Daily cost limit in USD (prevents overspending)
    costLimit: 100.0,
  },

  // ============================================================================
  // Performance Tracking
  // ============================================================================
  // Enable to track latency, costs, and success rates
  performanceTracking: true,
})
