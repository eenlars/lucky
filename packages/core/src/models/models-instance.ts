/**
 * Singleton Models instance configured from core-config.
 * Provides a centralized instance of @lucky/models for the entire core package.
 */

import { getCoreConfig } from "@core/core-config"
import { getCurrentProvider } from "@core/utils/spending/provider"
import { Models, type ModelsConfig, type ProviderConfig } from "@lucky/models"
import { buildTierConfigFromDefaults } from "./tier-config-builder"

let modelsInstance: Models | null = null

/**
 * Build provider configuration from core config and environment.
 * In test environments (when API keys are missing), provides mock API keys
 * to allow unit tests to run without real credentials.
 */
function buildProviderConfig(): Record<string, ProviderConfig> {
  const provider = getCurrentProvider()
  const _config = getCoreConfig()
  const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true"

  const providers: Record<string, ProviderConfig> = {}

  // Configure based on current provider
  // Note: Lucky only supports openai, openrouter, and groq as primary providers
  // Anthropic models are accessed via OpenRouter
  switch (provider) {
    case "openai":
      providers.openai = {
        id: "openai",
        apiKey: process.env.OPENAI_API_KEY || (isTest ? "test-key" : undefined),
        enabled: true,
      }
      break

    case "openrouter":
      providers.openrouter = {
        id: "openrouter",
        apiKey: process.env.OPENROUTER_API_KEY || (isTest ? "test-key" : undefined),
        baseUrl: "https://openrouter.ai/api/v1",
        enabled: true,
      }
      break

    case "groq":
      providers.groq = {
        id: "groq",
        apiKey: process.env.GROQ_API_KEY || (isTest ? "test-key" : undefined),
        baseUrl: "https://api.groq.com/openai/v1",
        enabled: true,
      }
      break
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
