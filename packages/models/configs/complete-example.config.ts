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
      providers: [
        "openrouter/google/gemini-2.5-flash-lite",
        "openai/gpt-4o-mini",
        "groq/llama-3.3-70b-versatile",
      ],
      timeout: 10000, // 10 seconds
      maxCost: 0.01, // Max $0.01 per request
    },

    // Local-first - prefer local models, fallback to cloud
    local_first: {
      strategy: "fallback",
      providers: [
        "local/llama-3.3-70b-instruct",
        "local/mistral-nemo-12b",
        "openrouter/google/gemini-2.5-flash-lite",
      ],
      timeout: 30000,
      maxCost: 0.05,
    },

    // High quality - use best models
    high_quality: {
      strategy: "first",
      providers: [
        "openrouter/openai/gpt-4.1",
        "anthropic/claude-sonnet-4",
      ],
      timeout: 60000,
      maxCost: 1.0,
    },

    // Cost optimized - cheapest models only
    cheap: {
      strategy: "first",
      providers: [
        "openrouter/google/gemini-2.5-flash-lite",
        "openrouter/deepseek/deepseek-chat",
      ],
      timeout: 15000,
      maxCost: 0.001, // Max $0.001 per request
    },

    // Reasoning - models with extended thinking
    reasoning: {
      strategy: "first",
      providers: [
        "openrouter/openai/gpt-4.1-mini",
        "openrouter/google/gemini-2.5-pro-thinking",
      ],
      timeout: 120000, // 2 minutes for thinking
      maxCost: 2.0,
    },

    // Multi-provider consensus - compare outputs
    consensus: {
      strategy: "consensus",
      providers: [
        "openrouter/openai/gpt-4.1-mini",
        "anthropic/claude-3-5-haiku",
        "openrouter/google/gemini-2.5-flash-lite",
      ],
      timeout: 45000,
      maxCost: 0.5,
    },

    // Balanced - good mix of speed, quality, cost
    balanced: {
      strategy: "first",
      providers: ["openrouter/openai/gpt-4.1-mini"],
      timeout: 30000,
      maxCost: 0.1,
    },

    // Research - experimentation with multiple options
    research: {
      strategy: "race",
      providers: [
        "openrouter/anthropic/claude-sonnet-4",
        "openrouter/openai/gpt-4.1",
        "openrouter/google/gemini-2.5-pro-preview",
      ],
      timeout: 60000,
      maxCost: 1.5,
    },

    // Fallback chain - comprehensive backup strategy
    robust: {
      strategy: "fallback",
      providers: [
        "openrouter/openai/gpt-4.1-mini",
        "openrouter/anthropic/claude-3-5-haiku",
        "openrouter/google/gemini-2.5-flash-lite",
        "openrouter/deepseek/deepseek-chat",
        "groq/llama-3.3-70b-versatile",
      ],
      timeout: 60000,
      maxCost: 0.2,
    },

    // Local development - all local models
    local_dev: {
      strategy: "race",
      providers: [
        "local/llama-3.3-70b-instruct",
        "local/mistral-nemo-12b",
        "local/qwen-2.5-coder-32b",
      ],
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
