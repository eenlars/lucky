/**
 * Example user configuration for models registry
 * Researchers can use these configs to customize model selection
 */

import { defineConfig } from "../src/config/define"

export default defineConfig({
  name: "Example Research Config",

  // Define experiments for A/B testing
  experiments: {
    // Fast mode: race multiple fast models
    fast: {
      strategy: "race",
      providers: ["openrouter"],
      timeout: 30000,
    },

    // Quality mode: use best models
    quality: {
      strategy: "first",
      providers: ["openrouter"],
      timeout: 60000,
      maxCost: 0.1,
    },

    // Local first: prefer local models, fallback to cloud
    local_first: {
      strategy: "fallback",
      providers: ["openrouter"],
      timeout: 45000,
    },

    // Consensus mode: run multiple models and compare
    consensus: {
      strategy: "consensus",
      providers: ["openrouter"],
      timeout: 90000,
    },
  },

  // Default settings
  defaults: {
    experiment: "fast",
    maxConcurrent: 50,
    timeout: 30000,
    costLimit: 10.0, // USD per hour
  },

  // Enable performance tracking
  performanceTracking: true,
})
