/**
 * Researcher Configuration Example
 *
 * Optimized for ML research and experimentation with cost controls.
 * This config demonstrates a typical researcher workflow.
 */

import { defineConfig } from "../src/config/define"

export default defineConfig({
  name: "ML Researcher Config",

  experiments: {
    // Quick experiments with fast, cheap models
    quick: {
      strategy: "race",
      providers: ["openrouter#google/gemini-2.5-flash-lite", "groq/llama-3.3-70b-versatile"],
      timeout: 10000,
      maxCost: 0.005,
    },

    // Standard experiments with balanced models
    standard: {
      strategy: "first",
      providers: ["openrouter#openai/gpt-4.1-mini"],
      timeout: 30000,
      maxCost: 0.1,
    },

    // High-stakes experiments with best models
    important: {
      strategy: "consensus",
      providers: ["openrouter#openai/gpt-4.1", "anthropic/claude-sonnet-4", "openrouter#google/gemini-2.5-pro-preview"],
      timeout: 90000,
      maxCost: 2.0,
    },

    // Local-only for privacy-sensitive research
    private: {
      strategy: "fallback",
      providers: ["local/llama-3.3-70b-instruct", "local/mistral-nemo-12b"],
      timeout: 60000,
    },
  },

  defaults: {
    experiment: "standard",
    maxConcurrent: 20,
    timeout: 30000,
    costLimit: 50.0, // $50 daily limit
  },

  performanceTracking: true,
})
