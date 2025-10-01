/**
 * Models Instance
 *
 * Singleton instance of the models registry configured with all available providers.
 * Tier configuration is dynamically generated from DEFAULT_MODELS in examples/settings/models.ts,
 * ensuring the models registry always uses the same tier models as the rest of the system.
 *
 * This enables:
 * - Multi-provider support (OpenAI, Anthropic, OpenRouter, Groq, local)
 * - Automatic fallbacks and racing strategies
 * - Tier-based model abstraction (nano, low, medium, high, reasoning, etc.)
 * - Automatic sync with centralized model configuration
 */

import { createModels } from "@lucky/models"
import { envi } from "@core/utils/env.mjs"
import { buildTierConfig, getDefaultTierName } from "./tier-config-builder"

export const models = createModels({
  providers: {
    openai: {
      id: "openai",
      apiKey: envi.OPENAI_API_KEY,
      enabled: true,
    },
    openrouter: {
      id: "openrouter",
      apiKey: envi.OPENROUTER_API_KEY || undefined,
      baseUrl: "https://openrouter.ai/api/v1",
      enabled: Boolean(envi.OPENROUTER_API_KEY),
    },
    groq: {
      id: "groq",
      apiKey: envi.GROQ_API_KEY || undefined,
      baseUrl: "https://api.groq.com/openai/v1",
      enabled: Boolean(envi.GROQ_API_KEY),
    },
    anthropic: {
      id: "anthropic",
      apiKey: envi.ANTHROPIC_API_KEY || undefined,
      enabled: Boolean(envi.ANTHROPIC_API_KEY),
    },
    local: {
      id: "local",
      baseUrl: "http://localhost:11434/v1",
      enabled: false, // Enable manually when Ollama is running
    },
  },
  // Dynamically build tier config from DEFAULT_MODELS
  // This includes: summary, nano, low, medium, high, default, fitness, reasoning, fallback
  tiers: buildTierConfig(),
  defaultTier: getDefaultTierName(),
  trackPerformance: true,
  trackCost: true,
})