/**
 * Singleton Models instance configured from core-config.
 * Provides a centralized instance of @lucky/models for the entire core package.
 */

import { Models, type ModelsConfig, type ProviderConfig } from "@lucky/models"
import { buildTierConfigFromDefaults } from "./tier-config-builder"

let modelsInstance: Models | null = null

/**
 * Build provider configuration from core config and environment.
 * Configures ALL providers that have API keys available.
 * In test environments (when API keys are missing), provides mock API keys
 * to allow unit tests to run without real credentials.
 */
function buildProviderConfig(): Record<string, ProviderConfig> {
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"

  const providers: Record<string, ProviderConfig> = {}

  // Configure all available providers (not just the current one)
  // This allows code to use any model from any provider (e.g., openai/gpt-4, openrouter/...)
  // Note: Lucky supports openai, openrouter, and groq as primary providers
  // Anthropic models are accessed via OpenRouter

  // OpenAI
  const openaiKey = process.env.OPENAI_API_KEY || (isTest ? "test-key" : undefined)
  if (openaiKey) {
    providers.openai = {
      id: "openai",
      apiKey: openaiKey,
      enabled: true,
    }
  }

  // OpenRouter
  const openrouterKey = process.env.OPENROUTER_API_KEY || (isTest ? "test-key" : undefined)
  if (openrouterKey) {
    providers.openrouter = {
      id: "openrouter",
      apiKey: openrouterKey,
      baseUrl: "https://openrouter.ai/api/v1",
      enabled: true,
    }
  }

  // Groq
  const groqKey = process.env.GROQ_API_KEY || (isTest ? "test-key" : undefined)
  if (groqKey) {
    providers.groq = {
      id: "groq",
      apiKey: groqKey,
      baseUrl: "https://api.groq.com/openai/v1",
      enabled: true,
    }
  }

  return providers
}

/**
 * Get or create the singleton Models instance.
 * Configured based on core-config settings.
 */
export function getModelsInstance(): Models {
  if (!modelsInstance) {
    const modelsConfig: ModelsConfig = {
      providers: buildProviderConfig(),
      tiers: buildTierConfigFromDefaults(),
      defaultTier: "default",
      trackPerformance: true,
      trackCost: true,
    }

    modelsInstance = new Models(modelsConfig)
  }

  return modelsInstance
}

/**
 * Reset the singleton instance (useful for testing or config changes).
 */
export function resetModelsInstance(): void {
  modelsInstance = null
}
